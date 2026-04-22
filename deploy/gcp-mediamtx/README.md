# GCP Free Tier MediaMTX Setup

This folder deploys MediaMTX on a Google Compute Engine `e2-micro` VM and keeps the main site on Cloud Run.

## Intended Model

- `Oracle` stays the future primary backend
- `GCP free tier VM` acts as fallback right now
- `Cloud Run app` keeps serving the website
- `Caddy` terminates HTTPS in front of MediaMTX

## Hostname

If you don't have a custom domain yet, use a hostname like:

- `YOUR_VM_IP.sslip.io`

That allows public HTTPS without waiting for custom DNS.

## Open Ports

Open these on the VM firewall:

- `9997/tcp`
- `80/tcp`
- `443/tcp`
- `8189/tcp`
- `8189/udp`
- `8890/udp`

## Files

- `docker-compose.yml`: MediaMTX + Caddy
- `Caddyfile`: HTTPS reverse proxy
- `mediamtx.yml`: browser publish, HLS, WebRTC, API config
- `.env.example`: VM-side domain value
- `cloud-run-env.example`: env values for the app fallback

## VM Commands

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker

mkdir -p ~/hospitality-media
cd ~/hospitality-media
```

Copy this folder to the VM, then:

```bash
cp .env.example .env
```

Set:

- `MEDIA_DOMAIN`
- `YOUR_GCP_SITE_DOMAIN`
- `YOUR_GCP_SITE_ALT_DOMAIN`
- `YOUR_MEDIA_DOMAIN`

Then run:

```bash
docker compose up -d
docker compose logs -f
```

## Cloud Run Env

Apply the values from `cloud-run-env.example`.

Use direct `http://YOUR_VM_IP:9997` for `MEDIAMTX_FALLBACK_API_URL`.
That API URL is server-side only. Browser playback should still use the HTTPS `webrtc` and `hls` URLs.

Later, when Oracle is ready, keep these fallback values and add:

- `MEDIAMTX_PRIMARY_API_URL`
- `NEXT_PUBLIC_MEDIAMTX_PRIMARY_WEBRTC_BASE_URL`
- `NEXT_PUBLIC_MEDIAMTX_PRIMARY_HLS_BASE_URL`

The app will prefer Oracle first and keep GCP as fallback.
