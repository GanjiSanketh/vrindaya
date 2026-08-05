using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Vrindaya.Api.Providers.OpenRouter;

/// <summary>
/// Provider that prepares prompts for the OpenRouter API. Real calls to
/// OpenRouter are intentionally not made yet — ExecutePromptAsync returns a
/// mock JSON response so the surrounding pipeline can be exercised end to end.
/// The API key is read from configuration (OpenRouter__ApiKey environment
/// variable or the "OpenRouter" section of appsettings.*.json), never
/// hardcoded.
/// </summary>
public class OpenRouterProvider
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<OpenRouterProvider> _logger;

    public OpenRouterProvider(IConfiguration configuration, ILogger<OpenRouterProvider> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Sends a prompt to OpenRouter. Currently returns a mock JSON payload
    /// instead of calling the OpenRouter API.
    /// </summary>
    /// <param name="prompt">The prompt to send to OpenRouter.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A JSON string shaped like an OpenRouter chat completion response.</returns>
    public async Task<string> ExecutePromptAsync(string prompt, CancellationToken cancellationToken = default)
    {
        var apiKey = _configuration["OpenRouter:ApiKey"];

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning(
                "OpenRouter ApiKey is not configured. Returning mock response for prompt of length {PromptLength}.",
                prompt.Length);
        }
        else
        {
            _logger.LogInformation(
                "OpenRouter ApiKey is configured. ApiKey Present: {ApiKeyPresent}. Returning mock response for prompt of length {PromptLength}.",
                true,
                prompt.Length);
        }

        var mockResponse = new
        {
            id = "mock-gen-" + Guid.NewGuid().ToString("N"),
            model = "mock-model",
            choices = new[]
            {
                new
                {
                    index = 0,
                    message = new
                    {
                        role = "assistant",
                        content = $"Mock response for prompt: {prompt}"
                    },
                    finish_reason = "stop"
                }
            },
            usage = new
            {
                prompt_tokens = 0,
                completion_tokens = 0,
                total_tokens = 0
            }
        };

        return await Task.FromResult(JsonSerializer.Serialize(mockResponse, new JsonSerializerOptions
        {
            WriteIndented = true,
            DefaultIgnoreCondition = JsonIgnoreCondition.Never
        }));
    }
}
