using System.ComponentModel.DataAnnotations;
using Vrindaya.Api.Validators;

namespace Vrindaya.Api.DTOs.WhatsApp;

/// <summary>
/// Request body for POST /api/v1/whatsapp/test.
/// </summary>
public class SendMessageRequest
{
    [Required(ErrorMessage = "Phone number is required.")]
    [WhatsAppPhoneNumber]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required(ErrorMessage = "Message is required.")]
    [StringLength(4096, ErrorMessage = "Message must be 4096 characters or fewer (WhatsApp's text body limit).")]
    public string Message { get; set; } = string.Empty;
}
