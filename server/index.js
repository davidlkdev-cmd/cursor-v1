import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';

import Session from './models/Session.js';
import { registerVoteHandler, startTurnTimer, clearTurnTimer } from './socket/voteHandler.js';
import { registerChatHandler, sendSystemMessage } from './socket/chatHandler.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ─── MongoDB ───────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/shared-cursor")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// ─── Player name/color pool ────────────────────────────────────────────────
const ADJECTIVES = ["void", "null", "ghost", "glitch", "neon", "silent", "dark", "phantom", "static", "rogue"];
const NOUNS = ["witch", "king", "moth", "prophet", "silk", "node", "byte", "shard", "pulse", "drift"];
const COLORS = ["#c0392b", "#4a7fa5", "#c8922a", "#3a8a4a", "#7e57a8", "#c0622a", "#5b8a8a", "#a05b8a"];

function randomName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}_${noun}`;
}

// ─── Single demo session ───────────────────────────────────────────────────
const DEMO_SESSION_ID = "demo";

async function getOrCreateSession() {
  let session = await Session.findOne({ sessionId: DEMO_SESSION_ID });
  if (!session) {
    session = await Session.create({
      sessionId: DEMO_SESSION_ID,
      cursor: { x: 100, y: 450 },
      goal: { x: 750, y: 80 },
      trail: [],
      players: [],
      votes: [],
      chat: [{ text: "— session started — waiting for players —", system: true, timestamp: new Date() }],
    });
    console.log("Demo session created");
  }
  return session;
}

// ─── REST: get initial state ───────────────────────────────────────────────
app.get("/api/session", async (req, res) => {
  const session = await getOrCreateSession();
  res.json(session);
});

app.post("/api/session/reset", async (req, res) => {
  await Session.deleteOne({ sessionId: DEMO_SESSION_ID });
  clearTurnTimer(DEMO_SESSION_ID);
  const session = await getOrCreateSession();
  io.to(DEMO_SESSION_ID).emit("session:reset", session);
  res.json({ ok: true });
});

// ─── Socket.io ────────────────────────────────────────────────────────────
io.on("connection", async (socket) => {
  console.log("Socket connected:", socket.id);

  // Auto-join the demo session
  socket.on("session:join", async () => {
    const session = await getOrCreateSession();

    // Assign name + color
    const usedColors = session.players.map((p) => p.color);
    const availableColor = COLORS.find((c) => !usedColors.includes(c)) || COLORS[Math.floor(Math.random() * COLORS.length)];

    const player = {
      id: socket.id,
      name: randomName(),
      color: availableColor,
      score: 0,
      weight: 1.0,
      connected: true,
    };

    session.players.push(player);
    await sendSystemMessage(io, session, `— ${player.name} joined —`);
    await session.save();

    socket.join(DEMO_SESSION_ID);

    // Send the joining player their identity + full state
    socket.emit("session:joined", { player, session });

    // Tell everyone else about the new player
    socket.to(DEMO_SESSION_ID).emit("player:joined", { player, players: session.players });

    // Start turn timer if this is the first player and game is in voting state
    const connectedCount = session.players.filter((p) => p.connected).length;
    if (connectedCount === 1 && session.status === "voting") {
      startTurnTimer(io, DEMO_SESSION_ID);
      io.to(DEMO_SESSION_ID).emit("turn:start", {
        turn: session.turn,
        timeoutMs: 10000,
      });
    }
  });

  // Register event handlers
  registerVoteHandler(io, socket);
  registerChatHandler(io, socket);

  // ── Disconnect ─────────────────────────────────────────────────────────
  socket.on("disconnect", async () => {
    console.log("Socket disconnected:", socket.id);
    const session = await Session.findOne({ sessionId: DEMO_SESSION_ID });
    if (!session) return;

    const player = session.players.find((p) => p.id === socket.id);
    if (player) {
      player.connected = false;
      await sendSystemMessage(io, session, `— ${player.name} left —`);
      await session.save();
      io.to(DEMO_SESSION_ID).emit("player:left", {
        playerId: socket.id,
        players: session.players,
      });
    }
  });
});

// ─── Start ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Set PORT to another value or stop the process using it.`);
    process.exit(1);
  }
  console.error('Server error:', err);
});
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));