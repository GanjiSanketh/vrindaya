using Google.Cloud.Firestore;

namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Firebase Admin SDK access. Today this only exposes a Firestore client
/// (built lazily from FirebaseOptions' service-account credentials, for
/// CampaignDeliveryWorker) — ID token verification for
/// TokenValidationMiddleware is still a reserved, unimplemented concern
/// that would also live here.
/// </summary>
public interface IFirebaseService
{
    /// <summary>Returns the shared FirestoreDb client, building it on first use. Safe to call repeatedly — reuses the same instance.</summary>
    FirestoreDb GetFirestoreDb();
}
