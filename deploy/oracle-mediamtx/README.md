# Oracle MediaMTX Setup

This folder contains a free-tier friendly deployment for running MediaMTX on an Oracle Cloud Always Free VM while keeping the main web app on Google Cloud.

## Architecture

- `your GCP site` serves the Next.js app
- `media.example.com` points to the Oracle VM
- `Caddy` terminates HTTPS on Oracle
- `MediaMTX` runs behind Caddy
- the app uses:
  - `https://media.example.com/api`
  - `https://media.example.com/webrtc`
  - `https://media.example.com/hls`

This avoids mixed-content issues when your GCP site is HTTPS.

## Files

- `docker-compose.yml`: runs MediaMTX and Caddy
- `Caddyfile`: exposes `/api`, `/webrtc`, `/hls` over HTTPS
- `mediamtx.yml`: MediaMTX config for browser publish, HLS, WebRTC, API
- `.env.example`: compose env for the Oracle side
- `gcp-app-env.example`: env values to paste into your GCP deployment

## Oracle VM

Recommended:

- Ubuntu 22.04 or 24.04
- public IPv4
- Always Free shape

## Oracle Ingress Rules

Open these inbound ports in the VM security list / NSG and in the instance firewall:

- `22/tcp` for SSH
- `80/tcp` for Caddy HTTP challenge and redirect
- `443/tcp` for HTTPS
- `8189/tcp` for WebRTC TCP fallback
- `8189/udp` for WebRTC UDP
- `8890/udp` optional extra WebRTC UDP port often exposed in MediaMTX examples

## DNS

Create an `A` record:

- `media.example.com -> ORACLE_PUBLIC_IP`

Wait until DNS resolves before starting Caddy, otherwise automatic TLS can fail.

## Oracle Commands

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker

mkdir -p ~/hospitality-media
cd ~/hospitality-media
```

Copy the contents of this folder to the VM, then:

```bash
cp .env.example .env
```

Edit these placeholders:

- in `.env`, set `MEDIA_DOMAIN`
- in `mediamtx.yml`, replace `YOUR_GCP_SITE_DOMAIN`
- in `mediamtx.yml`, replace `YOUR_MEDIA_DOMAIN`

Start everything:

```bash
docker compose up -d
docker compose logs -f
```

## GCP App Env

Use the values from `gcp-app-env.example`.

Example:

```env
MEDIAMTX_API_URL=https://media.example.com/api
NEXT_PUBLIC_MEDIAMTX_WEBRTC_BASE_URL=https://media.example.com/webrtc
NEXT_PUBLIC_MEDIAMTX_HLS_BASE_URL=https://media.example.com/hls
```

Redeploy the app after updating env.

## Verification

Phone publish URL:

```text
https://media.example.com/webrtc/phone-cctv/publish
```

Phone viewer URL:

```text
https://media.example.com/webrtc/phone-cctv
```

HLS viewer URL:

```text
https://media.example.com/hls/phone-cctv
```

API health quick check:

```text
https://media.example.com/api/v3/paths/list
```

## Notes

- Real RTSP CCTV works only if the Oracle VM can reach the CCTV RTSP address.
- If the CCTV is inside a private LAN, you will need port forwarding, VPN, or a reachable RTSP gateway.
- For strict mobile networks or remote publishing/viewing, adding a TURN server later can improve reliability.
