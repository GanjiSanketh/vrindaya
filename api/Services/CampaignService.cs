using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Services;

/// <summary>
/// Reserved for campaign send logic. IWhatsAppProvider is already injected
/// so the eventual "send this campaign" method has no DI wiring left to do.
/// Deliberately not called anywhere yet — see
/// docs/marketing/whatsapp-integration-plan.md for what has to happen first
/// (moving the queue processor here, template approval in Meta Business
/// Manager) before this service should actually dispatch anything.
/// </summary>
public class CampaignService : ICampaignService
{
    private readonly IWhatsAppProvider _whatsAppProvider;

    public CampaignService(IWhatsAppProvider whatsAppProvider)
    {
        _whatsAppProvider = whatsAppProvider;
    }
}
