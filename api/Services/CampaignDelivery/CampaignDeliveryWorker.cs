using Microsoft.Extensions.Options;
using Vrindaya.Api.Configuration;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.WhatsApp;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.CampaignDelivery;

/// <summary>
/// Polls campaignExecutions for QUEUED/IN_PROGRESS work and drives
/// campaignRecipients through QUEUED → SENDING → SENT/FAILED, one batch at
/// a time, via the existing IWhatsAppProvider. Deliberately does not touch
/// campaignQueue (the older, unprocessed Phase 2 collection) or the
/// WhatsApp webhook — see docs/marketing/campaign-module.md.
///
/// Resolves ICampaignDeliveryRepository/IWhatsAppProvider from a fresh DI
/// scope every poll tick rather than injecting them directly, because both
/// are registered Scoped/Transient and BackgroundService itself is a
/// singleton — the standard .NET pattern for a long-running service that
/// needs scoped dependencies.
/// </summary>
public class CampaignDeliveryWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly CampaignDeliveryOptions _options;
    private readonly ILogger<CampaignDeliveryWorker> _logger;

    public CampaignDeliveryWorker(
        IServiceScopeFactory scopeFactory,
        IOptions<CampaignDeliveryOptions> options,
        ILogger<CampaignDeliveryWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "CampaignDeliveryWorker started. PollingIntervalSeconds: {IntervalSeconds}, BatchSize: {BatchSize}",
            _options.PollingIntervalSeconds, _options.BatchSize);

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(_options.PollingIntervalSeconds));

        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await PollOnceAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "CampaignDeliveryWorker poll cycle failed unexpectedly — will retry next tick.");
            }
        }

        _logger.LogInformation("CampaignDeliveryWorker stopping.");
    }

    private async Task PollOnceAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<ICampaignDeliveryRepository>();
        var whatsAppProvider = scope.ServiceProvider.GetRequiredService<IWhatsAppProvider>();

        var executions = await repository.GetActiveExecutionsAsync(cancellationToken);

        foreach (var (executionId, execution) in executions)
        {
            if (execution.Status == CampaignExecutionStatus.Queued)
            {
                await repository.ClaimExecutionAsync(executionId, cancellationToken);
                _logger.LogInformation("Execution {ExecutionId} started.", executionId);
            }

            await ProcessExecutionBatchAsync(repository, whatsAppProvider, executionId, execution, cancellationToken);
        }
    }

    /// <summary>Processes exactly one batch for one execution. Called once per execution per poll tick.</summary>
    private async Task ProcessExecutionBatchAsync(
        ICampaignDeliveryRepository repository,
        IWhatsAppProvider whatsAppProvider,
        string executionId,
        CampaignExecutionDocument execution,
        CancellationToken cancellationToken)
    {
        try
        {
            // Cancellation support: a live re-read, not the (possibly stale) snapshot from GetActiveExecutionsAsync.
            var liveStatus = await repository.GetExecutionStatusAsync(executionId, cancellationToken);
            if (liveStatus != CampaignExecutionStatus.InProgress)
            {
                _logger.LogInformation(
                    "Execution {ExecutionId} is no longer IN_PROGRESS ({Status}) — skipping this tick.", executionId, liveStatus);
                return;
            }

            var recipients = await repository.GetQueuedRecipientsAsync(executionId, _options.BatchSize, cancellationToken);
            if (recipients.Count == 0)
            {
                await repository.CompleteExecutionAsync(executionId, cancellationToken);
                _logger.LogInformation("Execution {ExecutionId} completed — no recipients remain queued.", executionId);
                return;
            }

            var campaign = await repository.GetCampaignAsync(execution.CampaignId, cancellationToken);
            if (campaign is null)
            {
                _logger.LogWarning(
                    "Execution {ExecutionId} references missing campaign {CampaignId} — skipping this tick.",
                    executionId, execution.CampaignId);
                return;
            }

            _logger.LogInformation("Execution {ExecutionId} batch started. BatchSize: {Count}", executionId, recipients.Count);

            var successCount = 0;
            var failedCount = 0;

            foreach (var (recipientId, recipient) in recipients)
            {
                // Re-checked per recipient, not just per batch, so cancellation stops processing immediately mid-batch.
                var statusDuringBatch = await repository.GetExecutionStatusAsync(executionId, cancellationToken);
                if (statusDuringBatch == CampaignExecutionStatus.Cancelled)
                {
                    _logger.LogInformation("Execution {ExecutionId} cancelled — stopping mid-batch.", executionId);
                    break;
                }

                var success = await SendToRecipientAsync(
                    repository, whatsAppProvider, recipientId, recipient, campaign, cancellationToken);

                if (success) successCount++;
                else failedCount++;
            }

            var processedThisBatch = successCount + failedCount;
            await repository.UpdateExecutionStatsAsync(executionId, processedThisBatch, successCount, failedCount, cancellationToken);

            var newProcessed = execution.ProcessedRecipients + processedThisBatch;
            var percentComplete = execution.TotalRecipients == 0
                ? 100
                : (int)Math.Round(100.0 * newProcessed / execution.TotalRecipients);

            _logger.LogInformation(
                "Execution {ExecutionId} batch completed. Processed: {Processed}/{Total} ({PercentComplete}%), Successful: {Successful}, Failed: {Failed}",
                executionId, newProcessed, execution.TotalRecipients, percentComplete, successCount, failedCount);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            await repository.MarkExecutionFailedAsync(executionId, cancellationToken);
            _logger.LogError(ex, "Execution {ExecutionId} failed.", executionId);
        }
    }

    /// <summary>
    /// Sends to exactly one recipient and persists the outcome (status,
    /// messageId/errorMessage, the relevant *At timestamp, attempts).
    /// Returns true on success, false on failure — never throws, so a
    /// failure never aborts the rest of the batch.
    /// </summary>
    private async Task<bool> SendToRecipientAsync(
        ICampaignDeliveryRepository repository,
        IWhatsAppProvider whatsAppProvider,
        string recipientId,
        CampaignRecipientDocument recipient,
        CampaignDocument campaign,
        CancellationToken cancellationToken)
    {
        await repository.UpdateRecipientAsync(recipientId, new Dictionary<string, object?>
        {
            ["status"] = CampaignRecipientStatus.Sending,
        }, cancellationToken);

        var attempts = recipient.Attempts + 1;

        try
        {
            var result = await SendCampaignMessageAsync(whatsAppProvider, campaign, recipient.PhoneNumber, cancellationToken);

            if (result.Success)
            {
                await repository.UpdateRecipientAsync(recipientId, new Dictionary<string, object?>
                {
                    ["status"] = CampaignRecipientStatus.Sent,
                    ["messageId"] = result.MessageId,
                    ["sentAt"] = DateTime.UtcNow,
                    ["attempts"] = attempts,
                }, cancellationToken);
                return true;
            }

            await repository.UpdateRecipientAsync(recipientId, new Dictionary<string, object?>
            {
                ["status"] = CampaignRecipientStatus.Failed,
                ["errorMessage"] = result.ErrorMessage,
                ["failedAt"] = DateTime.UtcNow,
                ["attempts"] = attempts,
            }, cancellationToken);
            return false;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            await repository.UpdateRecipientAsync(recipientId, new Dictionary<string, object?>
            {
                ["status"] = CampaignRecipientStatus.Failed,
                ["errorMessage"] = ex.Message,
                ["failedAt"] = DateTime.UtcNow,
                ["attempts"] = attempts,
            }, cancellationToken);
            _logger.LogError(ex, "Recipient {RecipientId} failed unexpectedly during send.", recipientId);
            return false;
        }
    }

    /// <summary>
    /// Picks the Meta message type from the campaign's declared MediaType,
    /// falling back to a plain text send if the declared type's URL is
    /// somehow missing (defensive against inconsistent data) or the type is
    /// Text. This is the one place that maps "what the admin configured" to
    /// "which IWhatsAppProvider method to call" — everything else in this
    /// worker is media-type-agnostic.
    /// </summary>
    private static Task<WhatsAppSendResult> SendCampaignMessageAsync(
        IWhatsAppProvider whatsAppProvider, CampaignDocument campaign, string phoneNumber, CancellationToken cancellationToken)
    {
        var caption = string.IsNullOrWhiteSpace(campaign.Caption) ? null : campaign.Caption;

        return campaign.MediaType switch
        {
            CampaignMediaType.Video when !string.IsNullOrWhiteSpace(campaign.VideoUrl)
                => whatsAppProvider.SendVideoMessageAsync(phoneNumber, campaign.VideoUrl!, caption, cancellationToken),

            CampaignMediaType.Pdf when !string.IsNullOrWhiteSpace(campaign.DocumentUrl)
                => whatsAppProvider.SendDocumentMessageAsync(
                    phoneNumber, campaign.DocumentUrl!, caption, FileNameFromUrl(campaign.DocumentUrl!), cancellationToken),

            CampaignMediaType.Image when !string.IsNullOrWhiteSpace(campaign.ImageUrl)
                => whatsAppProvider.SendImageMessageAsync(phoneNumber, campaign.ImageUrl!, caption, cancellationToken),

            CampaignMediaType.Mixed
                => SendMixedMediaAsync(whatsAppProvider, campaign, phoneNumber, caption, cancellationToken),

            _ => whatsAppProvider.SendTextMessageAsync(phoneNumber, campaign.Message, cancellationToken),
        };
    }

    /// <summary>A Mixed campaign may have more than one media URL set — send the richest one that's actually present.</summary>
    private static Task<WhatsAppSendResult> SendMixedMediaAsync(
        IWhatsAppProvider whatsAppProvider, CampaignDocument campaign, string phoneNumber, string? caption, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(campaign.VideoUrl))
            return whatsAppProvider.SendVideoMessageAsync(phoneNumber, campaign.VideoUrl, caption, cancellationToken);

        if (!string.IsNullOrWhiteSpace(campaign.DocumentUrl))
            return whatsAppProvider.SendDocumentMessageAsync(phoneNumber, campaign.DocumentUrl, caption, FileNameFromUrl(campaign.DocumentUrl), cancellationToken);

        if (!string.IsNullOrWhiteSpace(campaign.ImageUrl))
            return whatsAppProvider.SendImageMessageAsync(phoneNumber, campaign.ImageUrl, caption, cancellationToken);

        return whatsAppProvider.SendTextMessageAsync(phoneNumber, campaign.Message, cancellationToken);
    }

    /// <summary>Meta requires a filename for document messages; best-effort derive one from the storage URL.</summary>
    private static string FileNameFromUrl(string url)
    {
        try
        {
            var lastSegment = new Uri(url).AbsolutePath.Split('/').LastOrDefault();
            return string.IsNullOrEmpty(lastSegment) ? "document.pdf" : Uri.UnescapeDataString(lastSegment);
        }
        catch (UriFormatException)
        {
            return "document.pdf";
        }
    }
}
