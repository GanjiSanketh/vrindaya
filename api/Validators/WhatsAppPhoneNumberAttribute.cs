using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace Vrindaya.Api.Validators;

/// <summary>
/// Validates a WhatsApp-formatted phone number: digits only, 10–15 digits,
/// country code included, no leading '+', no spaces or symbols — the
/// format Meta's Cloud API expects for the "to" field.
/// </summary>
public partial class WhatsAppPhoneNumberAttribute : ValidationAttribute
{
    public WhatsAppPhoneNumberAttribute()
        : base("Phone number must contain 10 to 15 digits, including the country code, with no spaces or symbols (e.g. 919999999999).")
    {
    }

    public override bool IsValid(object? value)
    {
        return value is string phoneNumber && PhoneNumberPattern().IsMatch(phoneNumber);
    }

    [GeneratedRegex(@"^\d{10,15}$")]
    private static partial Regex PhoneNumberPattern();
}
