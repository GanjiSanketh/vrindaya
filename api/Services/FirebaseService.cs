using Google.Cloud.Firestore;
using Microsoft.Extensions.Options;
using Vrindaya.Api.Configuration;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Services;

/// <summary>
/// Builds one shared FirestoreDb client — lazily, since building the
/// credential/gRPC channel is comparatively expensive and
/// CampaignDeliveryWorker calls this every poll tick. Registered as a
/// singleton (see ServiceCollectionExtensions) for the same reason an
/// HttpClient is reused rather than rebuilt per call.
///
/// Credential resolution itself lives in FirebaseCredentialProvider — this
/// class only turns whatever credential that returns into a FirestoreDb.
/// </summary>
public class FirebaseService : IFirebaseService
{
    private readonly FirebaseOptions _options;
    private readonly IWebHostEnvironment _environment;
    private readonly Lazy<FirestoreDb> _firestoreDb;

    public FirebaseService(IOptions<FirebaseOptions> options, IWebHostEnvironment environment)
    {
        _options = options.Value;
        _environment = environment;
        _firestoreDb = new Lazy<FirestoreDb>(BuildFirestoreDb);
    }

    public FirestoreDb GetFirestoreDb() => _firestoreDb.Value;

    private FirestoreDb BuildFirestoreDb()
    {
        var credential = FirebaseCredentialProvider.GetCredential(_options, _environment);

        return new FirestoreDbBuilder
        {
            ProjectId = credential.ProjectId,
            GoogleCredential = credential.ToGoogleCredential(),
        }.Build();
    }
}
