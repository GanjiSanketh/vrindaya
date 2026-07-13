# Dockerizing `api/`

`api/Dockerfile` is a production-ready, multi-stage build. It exists so
Render can build and run `api/` as a container (see [Render](render.md)),
but it's also the fastest way to reproduce the production runtime exactly
on a local machine.

## Image architecture

Two stages, and only the second one ships:

1. **Build stage** (`mcr.microsoft.com/dotnet/sdk:9.0`) — restores NuGet
   packages, then runs `dotnet publish -c Release /p:UseAppHost=false`.
   The `.csproj` is copied and restored *before* the rest of the source,
   so editing application code doesn't invalidate the restore layer on
   the next build. `UseAppHost=false` skips generating the native
   `Vrindaya.Api.exe` apphost — irrelevant in a container that always
   launches via `dotnet Vrindaya.Api.dll`.
2. **Runtime stage** (`mcr.microsoft.com/dotnet/aspnet:9.0`) — copies
   *only* `/app/publish` from the build stage. No SDK, no source, no
   NuGet cache, no intermediate build artifacts ever reach the final
   image — just the ASP.NET runtime plus the published app.

This is why the final image is small: everything expensive (the SDK,
restore packages, source) lives in a stage that's discarded once its one
output (`/app/publish`) has been copied out.

### Non-root user

The runtime stage creates a dedicated `vrindaya` system user (no login
shell, no home directory) and switches to it with `USER vrindaya` before
the container ever runs application code — following Microsoft's own
container security guidance to never run the entry point as root. The
published output is copied in with `--chown=vrindaya:vrindaya` so that
user actually owns the files it needs to read.

### Port and URLs

```dockerfile
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
```

Render (and `docker run -p`) forward external traffic to whatever port
the container listens on — `ASPNETCORE_URLS` is what tells Kestrel to
bind `8080` inside the container. This is set once, in the image; nothing
about it depends on `ASPNETCORE_ENVIRONMENT` or where the container runs.

### What never enters the image

- `api/.dockerignore` excludes `bin/`, `obj/`, `.vs/`, `.vscode/`, local
  `appsettings.Development.json`/`*.local.json`, and — critically —
  `Firebase/serviceAccount.json`, so a real credential never becomes part
  of the Docker build context in the first place.
- `api/Vrindaya.Api.csproj` also explicitly excludes `Firebase/**` from
  the project's own Content/None item globs. This matters even outside
  Docker: without it, a plain `dotnet publish` (no Docker involved at
  all) copies whatever's in `Firebase/serviceAccount.json` straight into
  the publish output — verified locally while building this Dockerfile.
  Both exclusions matter; `.dockerignore` alone wouldn't have caught a
  non-Docker `dotnet publish`, and the `.csproj` fix alone wouldn't
  protect other files someone might drop in the build context later.

Production reads the credential from the `FIREBASE_SERVICE_ACCOUNT_JSON`
environment variable instead — see [Firebase Setup](../FIREBASE_SETUP.md)
and [Render](render.md#required-environment-variables).

## Forwarded headers

Render terminates TLS at its edge and forwards plain HTTP to the
container — so from Kestrel's point of view, every request looks like
plain HTTP, even ones that arrived over HTTPS at Render's edge. Without
telling ASP.NET Core to trust the proxy's headers, `UseHttpsRedirection()`
would see `Request.Scheme == "http"` and could redirect every request,
including ones that were already secure.

`Program.cs` calls a small extension method before `UseHttpsRedirection()`:

```csharp
app.UseGlobalExceptionHandling();
app.UseRenderForwardedHeaders();   // must run before UseHttpsRedirection()
app.UseSerilogRequestLogging();
...
app.UseHttpsRedirection();
```

`UseRenderForwardedHeaders()` (in `Extensions/ApplicationBuilderExtensions.cs`)
configures `ForwardedHeadersMiddleware` to trust `X-Forwarded-For` and
`X-Forwarded-Proto`, with `KnownNetworks`/`KnownProxies` cleared — Render's
proxy isn't a fixed, well-known IP that can be pinned via the framework's
default allow-list, so both are cleared, matching Microsoft's own
recommendation for cloud load balancers with no fixed address.

## Local Docker build

From the `api/` directory:

```bash
cd api
docker build -t vrindaya-api .
```

This runs both stages described above. A cold build (empty local Docker
cache) restores NuGet packages and takes the usual `dotnet restore` time;
a rebuild after only touching application code reuses the cached restore
layer and is much faster.

## Local Docker run

```bash
docker run --rm -p 8080:8080 \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e FIREBASE_SERVICE_ACCOUNT_JSON="$(cat api/Firebase/serviceAccount.json)" \
  -e WhatsApp__AccessToken=<your-test-token> \
  -e WhatsApp__PhoneNumberId=<your-test-phone-id> \
  -e WhatsApp__BusinessAccountId=<your-test-waba-id> \
  -e WhatsApp__VerifyToken=<your-chosen-verify-token> \
  vrindaya-api
```

`api/Firebase/serviceAccount.json` is your own local, git-ignored file —
this command reads it from the host and passes its contents in as the
environment variable, exactly like Render would receive it from its
dashboard. The file itself is never copied into the image (see
[What never enters the image](#what-never-enters-the-image) above).

If you don't have WhatsApp test credentials handy, you can omit those
three `-e` flags — the app still starts and `/health` still responds;
only `WhatsAppService`/`MetaWhatsAppProvider` calls would fail.

### Health endpoint verification

```bash
curl -i http://localhost:8080/health
# HTTP/1.1 200 OK
# Healthy

curl -i http://localhost:8080/api/v1/health
# HTTP/1.1 200 OK
# { "status": "Healthy", "application": "Vrindaya API", ... }
```

### Confirming Swagger is Development-only

```bash
curl -o /dev/null -s -w "%{http_code}\n" http://localhost:8080/swagger/v1/swagger.json
# 404 — because ASPNETCORE_ENVIRONMENT=Production was set above
```

Re-run the container with `-e ASPNETCORE_ENVIRONMENT=Development` (and,
if you want the interactive UI, use `docker run -p 8080:8080` and visit
`http://localhost:8080/swagger`) to confirm the opposite: Swagger
responds `200` only in `Development`.

## Troubleshooting

**Build fails restoring packages** — check network access; NuGet needs
to reach `api.nuget.org` from wherever `docker build` runs (a CI runner
behind a restrictive proxy is the most common cause).

**Container exits immediately** — run without `--rm -d` (i.e.
foreground) and read the console output directly; a missing/invalid
`FIREBASE_SERVICE_ACCOUNT_JSON` does **not** crash the app (the worker
just logs a retryable error), so an immediate exit points at something
else — most likely a missing `ASPNETCORE_URLS` (if you overrode the
image's `ENV` and didn't replace it with something valid) or a genuine
unhandled startup exception.

**`/health` doesn't respond** — confirm the port mapping
(`-p 8080:8080`) matches `ASPNETCORE_URLS=http://+:8080` baked into the
image; if you changed one, change the other.

**`CampaignDeliveryWorker poll cycle failed unexpectedly`** — expected if
`FIREBASE_SERVICE_ACCOUNT_JSON` is missing or invalid; see
[Firebase Setup](../FIREBASE_SETUP.md) and
[TROUBLESHOOTING.md](../TROUBLESHOOTING.md#worker-not-running) for the
exact error messages and what each one means.

**Image is larger than expected** — confirm you're not accidentally
building from a Dockerfile/context that skips the multi-stage split
(e.g. a stray `FROM mcr.microsoft.com/dotnet/sdk:9.0` with no second
`FROM aspnet:9.0` stage). `docker images vrindaya-api` should show a size
in the ASP.NET runtime range, not the much larger SDK range.
