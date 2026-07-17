using System.Text.Json;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.WhatsApp;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public class WhatsAppController : ControllerBase
{
    private readonly IWhatsAppService _whatsAppService;

    public WhatsAppController(IWhatsAppService whatsAppService)
    {
        _whatsAppService = whatsAppService;
    }

    /// <summary>Configuration presence only — no secrets, no live Meta call. Part of the admin WhatsApp Settings surface, not a public/storefront endpoint — no frontend caller uses this without being signed in as admin.</summary>
    [HttpGet("health")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(WhatsAppHealthDto), StatusCodes.Status200OK)]
    public ActionResult<WhatsAppHealthDto> GetHealth()
    {
        return Ok(_whatsAppService.GetHealthStatus());
    }

    /// <summary>
    /// Sends a real WhatsApp text message via Meta's Cloud API. 502 (not 500)
    /// on a Meta rejection — the request was handled correctly by this API,
    /// an upstream dependency declined it. Admin-only — this triggers a real,
    /// billable Meta send, unlike GetHealth above.
    /// </summary>
    [HttpPost("test")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [EnableRateLimiting("whatsapp-send")]
    [ProducesResponseType(typeof(SendMessageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(SendMessageResponse), StatusCodes.Status502BadGateway)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SendMessageResponse>> SendTest(
        [FromBody] SendMessageRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _whatsAppService.SendTestMessageAsync(request, cancellationToken);

        return response.Success
            ? Ok(response)
            : StatusCode(StatusCodes.Status502BadGateway, response);
    }

    /// <summary>
    /// Meta's webhook subscription handshake. Called by Meta, not by our own
    /// clients — must stay reachable without Firebase auth even once
    /// TokenValidationMiddleware is implemented (see AllowAnonymous below).
    /// </summary>
    [HttpGet("webhook")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public IActionResult VerifyWebhook(
        [FromQuery(Name = "hub.mode")] string? mode,
        [FromQuery(Name = "hub.verify_token")] string? verifyToken,
        [FromQuery(Name = "hub.challenge")] string? challenge)
    {
        var result = _whatsAppService.VerifyWebhookSubscription(mode, verifyToken, challenge);

        if (!result.IsVerified)
        {
            return StatusCode(StatusCodes.Status403Forbidden);
        }

        return Content(result.Challenge!, "text/plain");
    }

    /// <summary>
    /// Receives delivery/status/message webhook events from Meta. Recorded
    /// in logs only — see docs/marketing/whatsapp-integration-plan.md for
    /// why processing (e.g. updating campaignQueue) isn't implemented yet.
    /// JsonElement avoids modeling Meta's full webhook schema for data we
    /// don't act on yet.
    /// </summary>
    [HttpPost("webhook")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult ReceiveWebhook([FromBody] JsonElement payload)
    {
        _whatsAppService.RecordWebhookEvent(payload.GetRawText());
        return Ok();
    }
}
