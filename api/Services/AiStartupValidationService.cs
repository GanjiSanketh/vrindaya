using Microsoft.Extensions.Options;
using Vrindaya.Api.AI.Core.Configuration;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Core.Templates;
using Vrindaya.Api.AI.Orchestrator.Interfaces;

namespace Vrindaya.Api.Services;

public interface IAiStartupValidationService
{
    void Validate();
}

public sealed class AiStartupValidationService : IAiStartupValidationService
{
    private readonly IOptions<GeminiSettings> _geminiSettings;
    private readonly IOptions<AiProviderSettings> _providerSettings;
    private readonly IPromptTemplateService _promptTemplateService;
    private readonly IEnumerable<IAiModule> _modules;
    private readonly ILogger<AiStartupValidationService> _logger;

    public AiStartupValidationService(
        IOptions<GeminiSettings> geminiSettings,
        IOptions<AiProviderSettings> providerSettings,
        IPromptTemplateService promptTemplateService,
        IEnumerable<IAiModule> modules,
        ILogger<AiStartupValidationService> logger)
    {
        _geminiSettings = geminiSettings;
        _providerSettings = providerSettings;
        _promptTemplateService = promptTemplateService;
        _modules = modules;
        _logger = logger;
    }

    public void Validate()
    {
        var errors = new List<string>();
        var gemini = _geminiSettings.Value;
        var provider = _providerSettings.Value;

        if (!Enum.IsDefined(typeof(AiProviderType), provider.ResolvedProvider))
        {
            errors.Add($"AI:Provider '{provider.Provider}' is not a valid provider. Expected 'Mock' or 'Gemini'.");
        }

        if (string.IsNullOrWhiteSpace(gemini.Model))
        {
            errors.Add("AI:Gemini:Model is missing. Configure a model name (e.g. 'gemini-1.5-flash').");
        }

        if (gemini.Temperature < 0 || gemini.Temperature > 2)
        {
            errors.Add($"AI:Gemini:Temperature is {gemini.Temperature}, outside valid range 0–2.");
        }

        if (gemini.MaxOutputTokens <= 0)
        {
            errors.Add($"AI:Gemini:MaxOutputTokens is {gemini.MaxOutputTokens}; must be greater than 0.");
        }

        if (gemini.InputTokenPricePerMillion < 0)
        {
            errors.Add("AI:Gemini:InputTokenPricePerMillion is negative. Pricing must be zero or positive.");
        }

        if (gemini.OutputTokenPricePerMillion < 0)
        {
            errors.Add("AI:Gemini:OutputTokenPricePerMillion is negative. Pricing must be zero or positive.");
        }

        var templates = _promptTemplateService.GetAll();
        if (templates.Count == 0)
        {
            errors.Add("No prompt templates loaded. Verify embedded resources or AI:Templates configuration.");
        }

        var moduleList = _modules.ToList();
        if (moduleList.Count == 0)
        {
            errors.Add("No AI modules registered. Verify IAiModule registrations in ServiceCollectionExtensions.");
        }

        if (errors.Count > 0)
        {
            foreach (var err in errors)
            {
                _logger.LogCritical("[STARTUP] {Error}", err);
            }

            throw new InvalidOperationException(
                $"AI configuration validation failed.{Environment.NewLine}{string.Join(Environment.NewLine, errors)}");
        }

        _logger.LogInformation(
            "[STARTUP] AI configuration validated — provider {Provider}, model {Model}, " +
            "{TemplateCount} template(s), {ModuleCount} module(s).",
            provider.ResolvedProvider,
            gemini.Model,
            templates.Count,
            moduleList.Count);
    }
}
