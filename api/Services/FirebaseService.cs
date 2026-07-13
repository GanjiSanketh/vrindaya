using System.Text.Json;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore;
using Microsoft.Extensions.Options;
using Vrindaya.Api.Configuration;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Services;

/// <summary>
/// Builds one shared FirestoreDb client from FirebaseOptions' service-account
/// fields — lazily, since building the credential/gRPC channel is
/// comparatively expensive and CampaignDeliveryWorker calls this every poll
/// tick. Registered as a singleton (see ServiceCollectionExtensions) for the
/// same reason an HttpClient is reused rather than rebuilt per call.
/// </summary>
public class FirebaseService : IFirebaseService
{
    private readonly FirebaseOptions _options;
    private readonly Lazy<FirestoreDb> _firestoreDb;

    public FirebaseService(IOptions<FirebaseOptions> options)
    {
        _options = options.Value;
        _firestoreDb = new Lazy<FirestoreDb>(BuildFirestoreDb);
    }

    public FirestoreDb GetFirestoreDb() => _firestoreDb.Value;

    /// <summary>
    /// FirebaseOptions carries only ProjectId/ClientEmail/PrivateKey — the
    /// minimum needed to construct a valid service-account credential JSON
    /// in memory, rather than requiring a full downloaded key file on disk.
    /// </summary>
    private FirestoreDb BuildFirestoreDb()
    {
        var credentialJson = JsonSerializer.Serialize(new
        {
            type = "service_account",
            project_id = _options.ProjectId,
            private_key = _options.PrivateKey,
            client_email = _options.ClientEmail,
            token_uri = "https://oauth2.googleapis.com/token",
        });

        // CredentialFactory + ToGoogleCredential() is the non-deprecated
        // replacement for GoogleCredential.FromJson()/FirestoreDbBuilder's
        // own JsonCredentials property, both of which are obsolete as of
        // the installed Google.Apis.Auth version.
        var serviceAccountCredential = CredentialFactory.FromJson<ServiceAccountCredential>(credentialJson);

        return new FirestoreDbBuilder
        {
            ProjectId = _options.ProjectId,
            GoogleCredential = serviceAccountCredential.ToGoogleCredential(),
        }.Build();
    }
}
