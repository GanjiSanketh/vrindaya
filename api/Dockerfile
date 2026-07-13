# syntax=docker/dockerfile:1

# ── Build stage ────────────────────────────────────────────────────────────
# .NET SDK image — only used to restore/publish; never shipped in the final
# image, which is where most of a naive "just FROM sdk" image's size goes.
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

ENV DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_NOLOGO=1

# Restore first, in its own layer keyed only on the .csproj — so editing
# application code doesn't invalidate the (comparatively slow) NuGet
# restore layer on the next build.
COPY Vrindaya.Api.csproj ./
RUN dotnet restore Vrindaya.Api.csproj

# Now bring in the rest of the source and publish. UseAppHost=false skips
# generating the native apphost executable (Vrindaya.Api.exe) — irrelevant
# in a container that always launches via `dotnet Vrindaya.Api.dll`, and
# one less native binary in the publish output.
COPY . .
RUN dotnet publish Vrindaya.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

# ── Runtime stage ───────────────────────────────────────────────────────────
# ASP.NET runtime only — no SDK, no source, no NuGet cache. This is the
# image that actually ships; it contains nothing but the published output
# copied in below plus the base runtime layers.
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Non-root user (Microsoft container security guidance: never run the
# entry point as root). "vrindaya" has no login shell and no home
# directory — it exists solely to own and run this one process.
RUN groupadd --system vrindaya \
    && useradd --system --gid vrindaya --no-create-home --shell /usr/sbin/nologin vrindaya

COPY --from=build --chown=vrindaya:vrindaya /app/publish .

# Render terminates TLS at its edge and forwards plain HTTP to whatever
# port the container listens on — Kestrel needs to bind that exact port.
# ASPNETCORE_ENVIRONMENT defaults to Production here as a fail-safe; set
# it explicitly in Render's dashboard for clarity (see docs/deployment/render.md)
# — a platform-set environment variable overrides this Dockerfile default.
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

USER vrindaya

ENTRYPOINT ["dotnet", "Vrindaya.Api.dll"]
