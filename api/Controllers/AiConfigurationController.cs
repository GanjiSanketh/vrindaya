using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Vrindaya.Api.AI.Core.Configuration;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Core.Models;
using Vrindaya.Api.Constants;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/ai/config")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
[Produces("application/json")]
[Tags("AI Configuration")]
public class AiConfigurationController : ControllerBase
{
    private readonly IAiProviderSelector _providerSelector;
    private readonly IOptions<GeminiSettings> _geminiSettings;
    private readonly AiConfiguration _configuration;
    private readonly ILogger<AiConfigurationController> _logger;

    public AiConfigurationController(
        IAiProviderSelector providerSelector,
        IOptions<GeminiSettings> geminiSettings,
        AiConfiguration configuration,
        ILogger<AiConfigurationController> logger)
    {
        _providerSelector = providerSelector ?? throw new ArgumentNullException(nameof(providerSelector));
        _geminiSettings = geminiSettings ?? throw new ArgumentNullException(nameof(geminiSettings));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    [HttpGet]
    [ProducesResponseType(typeof(AiConfigurationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public ActionResult<AiConfigurationDto> Get()
    {
        var gemini = _geminiSettings.Value;
        var activeProvider = _providerSelector.ActiveProvider;
        var provider = _providerSelector.Resolve();
        var generationSettings = _configuration.ForProvider(activeProvider);

        _logger.LogInformation(
            "AI config requested — provider {Provider}, model {Model}.",
            provider.ProviderName, generationSettings.Model);

        return Ok(new AiConfigurationDto
        {
            Provider = activeProvider,
            ProviderName = provider.ProviderName,
            Model = generationSettings.Model,
            Temperature = generationSettings.Temperature,
            MaxTokens = generationSettings.MaxOutputTokens,
            TimeoutSeconds = generationSettings.TimeoutSeconds,
            IsMockModeEnabled = provider.IsMock,
            Pricing = new AiPricingDto
            {
                InputTokenPricePerMillion = gemini.InputTokenPricePerMillion,
                OutputTokenPricePerMillion = gemini.OutputTokenPricePerMillion,
            },
        });
    }
}
