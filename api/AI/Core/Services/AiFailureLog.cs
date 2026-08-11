using System.Net.Http;
using System.Text;
using Vrindaya.Api.AI.Core.Providers.Gemini;

namespace Vrindaya.Api.AI.Core.Services;

/// <summary>
/// Renders the full detail of an AI failure into a single log-ready string:
/// the exception type, message, stack trace, the complete inner-exception
/// chain and any HTTP status carried by the exception
/// (<see cref="GeminiApiException.UpstreamStatusCode"/> /
/// <see cref="HttpRequestException.StatusCode"/>).
///
/// Intended for catch blocks that must degrade gracefully (for example the
/// AI Workspace reply fallback): the detail is logged first, then the caller
/// substitutes its friendly message. Nothing here redacts or rethrows — it
/// only formats.
/// </summary>
public static class AiFailureLog
{
    /// <summary>
    /// Formats an exception tree as indented text, including every
    /// <see cref="Exception.InnerException"/> level. Never throws.
    /// </summary>
    public static string Describe(Exception exception)
    {
        if (exception is null)
        {
            return string.Empty;
        }

        var sb = new StringBuilder();
        AppendException(sb, exception, depth: 0);
        return sb.ToString();
    }

    private static void AppendException(StringBuilder sb, Exception exception, int depth)
    {
        var indent = new string(' ', depth * 2);

        sb.Append(indent).Append("type: ").AppendLine(exception.GetType().FullName);
        sb.Append(indent).Append("message: ").AppendLine(exception.Message);

        switch (exception)
        {
            case GeminiApiException gemini:
                if (gemini.UpstreamStatusCode is { } upstream)
                {
                    sb.Append(indent)
                        .Append("httpStatus: ")
                        .AppendLine($"{(int)upstream} ({upstream})");
                }

                if (!string.IsNullOrWhiteSpace(gemini.UpstreamStatus))
                {
                    sb.Append(indent).Append("upstreamStatus: ").AppendLine(gemini.UpstreamStatus);
                }

                sb.Append(indent).Append("mappedStatusCode: ").AppendLine(gemini.StatusCode.ToString());
                break;

            case HttpRequestException http when http.StatusCode is { } httpStatus:
                sb.Append(indent)
                    .Append("httpStatus: ")
                    .AppendLine($"{(int)httpStatus} ({httpStatus})");
                break;
        }

        if (!string.IsNullOrWhiteSpace(exception.StackTrace))
        {
            sb.Append(indent).Append("stackTrace: ").AppendLine(exception.StackTrace);
        }

        if (exception.InnerException is not null)
        {
            sb.Append(indent).AppendLine("innerException:");
            AppendException(sb, exception.InnerException, depth + 1);
        }
    }
}
