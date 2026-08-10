using System.Diagnostics;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Vrindaya.Api.AI.Core.Configuration;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Core.Providers;
using Vrindaya.Api.AI.Core.Providers.Gemini;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs;

namespace Vrindaya.Api.Controllers;

/// <summary>
/// Exposes the AI module's operational surface to API consumers.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/ai")]
public class AiController : ControllerBase
{
    private readonly IAiProviderSelector _providerSelector;
    private readonly MockAiProvider _mockAiProvider;
    private readonly GeminiAiProvider _geminiAiProvider;
    private readonly IOptions<AiProviderSettings> _aiProviderSettings;
    private readonly IOptions<GeminiSettings> _geminiSettings;
    private readonly ILogger<AiController> _logger;

    public AiController(
        IAiProviderSelector providerSelector,
        MockAiProvider mockAiProvider,
        GeminiAiProvider geminiAiProvider,
        IOptions<AiProviderSettings> aiProviderSettings,
        IOptions<GeminiSettings> geminiSettings,
        ILogger<AiController> logger)
    {
        _providerSelector = providerSelector ?? throw new ArgumentNullException(nameof(providerSelector));
        _mockAiProvider = mockAiProvider ?? throw new ArgumentNullException(nameof(mockAiProvider));
        _geminiAiProvider = geminiAiProvider ?? throw new ArgumentNullException(nameof(geminiAiProvider));
        _aiProviderSettings = aiProviderSettings ?? throw new ArgumentNullException(nameof(aiProviderSettings));
        _geminiSettings = geminiSettings ?? throw new ArgumentNullException(nameof(geminiSettings));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Reports the active AI provider, the registered provider candidates and
    /// the active provider's health status. Never contacts an external API — all
    /// capability signals come from DI registrations and local configuration.
    /// </summary>
    [HttpGet("health")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AiHealthCheckDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AiHealthCheckDto>> Health(CancellationToken cancellationToken)
    {
        // Provider routing is owned by IAiProviderSelector — the controller only
        // reports what it resolved, and never branches on a provider name.
        var activeProvider = _providerSelector.Resolve();
        var isGeminiActive = _providerSelector.ActiveProvider == AiProviderType.Gemini;
        var geminiConfigured = !string.IsNullOrWhiteSpace(_geminiSettings.Value.ApiKey);

        var sw = Stopwatch.StartNew();
        var status = await activeProvider.HealthCheckAsync(cancellationToken);
        sw.Stop();

        _logger.LogInformation(
            "AI health probe: provider {Provider}, healthy {IsHealthy}, response time {ResponseTimeMs}ms.",
            activeProvider.ProviderName, status.IsHealthy, sw.ElapsedMilliseconds);

        return Ok(new AiHealthCheckDto
        {
            CurrentProvider = activeProvider.ProviderName,
            ConfiguredProvider = _aiProviderSettings.Value.ResolvedProvider.ToString(),
            Model = _geminiSettings.Value.Model,
            MockAiProvider = new AiProviderHealthDto
            {
                Name = _mockAiProvider.ProviderName,
                IsActive = !isGeminiActive,
                IsRegistered = true,
                IsMock = _mockAiProvider.IsMock,
                IsConfigured = true,
            },
            GeminiAiProvider = new AiProviderHealthDto
            {
                Name = _geminiAiProvider.ProviderName,
                IsActive = isGeminiActive,
                IsRegistered = true,
                IsMock = _geminiAiProvider.IsMock,
                IsConfigured = geminiConfigured,
            },
            Health = status,
            Version = AppConstants.ApplicationVersion,
            ResponseTimeMs = sw.ElapsedMilliseconds,
        });
    }
}