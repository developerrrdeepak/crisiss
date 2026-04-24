import http from "node:http";
import express from "express";
import { Server } from "socket.io";

const app = express();
app.set("trust proxy", 1);

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "aegis-socket-service",
  });
});

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
  transports: ["polling", "websocket"],
});

function roleRoom(role) {
  return `role:${role}`;
}

function normalizeString(value, fallback = "") {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

function buildAlertPayload(payload, sourceRole) {
  return {
    incidentId: normalizeString(payload?.incidentId, `INC-${Date.now()}`),
    guestId: normalizeString(payload?.guestId),
    guestName: normalizeString(payload?.guestName, "Unknown user"),
    roomId: normalizeString(payload?.roomId, "Unknown"),
    audioChannel: normalizeString(payload?.audioChannel),
    timestamp: normalizeString(payload?.timestamp, new Date().toISOString()),
    type: normalizeString(payload?.type, "SOS Distress"),
    originRole: sourceRole,
    activeTransport: normalizeString(payload?.activeTransport, "internet"),
    transportMode: normalizeString(payload?.transportMode, "auto"),
    transportChannels:
      payload?.transportChannels && typeof payload.transportChannels === "object"
        ? payload.transportChannels
        : undefined,
  };
}

function broadcastAlert(payload, sourceRole) {
  const alert = buildAlertPayload(payload, sourceRole);
  io.to(roleRoom("admin")).emit("sos-alert", alert);
  io.to(roleRoom("staff")).emit("sos-alert", alert);
}

function relaySignal(eventName, socket, payload) {
  const target = normalizeString(payload?.target);
  if (!target) {
    return;
  }

  const nextPayload = {
    ...payload,
    senderId: socket.id,
  };

  if (eventName === "webrtc-offer") {
    nextPayload.callerId = socket.id;
  }

  if (eventName === "webrtc-answer") {
    nextPayload.answererId = socket.id;
  }

  io.to(target).emit(eventName, nextPayload);
}

io.on("connection", (socket) => {
  socket.on("join-role", (role) => {
    const normalizedRole = normalizeString(role);
    if (!normalizedRole) {
      return;
    }

    socket.join(roleRoom(normalizedRole));
  });

  socket.on("join-radio-channel", (channelId) => {
    const normalizedChannelId = normalizeString(channelId);
    if (!normalizedChannelId) {
      return;
    }

    socket.join(normalizedChannelId);
    socket.to(normalizedChannelId).emit("user-joined-radio", socket.id);
  });

  socket.on("trigger-sos", (payload) => {
    const originRole = normalizeString(payload?.originRole, "guest");
    broadcastAlert(payload, originRole);
  });

  socket.on("call-front-desk", (payload) => {
    broadcastAlert(
      {
        ...payload,
        type: normalizeString(payload?.type, "Front Desk Call"),
      },
      normalizeString(payload?.originRole, "guest"),
    );
  });

  socket.on("resolve-alert", (payload) => {
    const resolvedPayload = {
      incidentId: normalizeString(payload?.incidentId),
      roomId: normalizeString(payload?.roomId),
    };

    io.emit("alert-resolved", resolvedPayload);
  });

  socket.on("webrtc-offer", (payload) => {
    relaySignal("webrtc-offer", socket, payload);
  });

  socket.on("webrtc-answer", (payload) => {
    relaySignal("webrtc-answer", socket, payload);
  });

  socket.on("webrtc-ice-candidate", (payload) => {
    relaySignal("webrtc-ice-candidate", socket, payload);
  });
});

const port = Number(process.env.PORT || 8080);
server.listen(port, "0.0.0.0", () => {
  console.log(`Aegis socket service listening on ${port}`);
});
