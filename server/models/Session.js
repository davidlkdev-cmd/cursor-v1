import mongoose from 'mongoose';

const PlayerSchema = new mongoose.Schema({
  id: String,
  name: String,
  color: String,
  score: { type: Number, default: 0 },
  weight: { type: Number, default: 1.0 },
  connected: { type: Boolean, default: true },
});

const VoteSchema = new mongoose.Schema({
  playerId: String,
  angle: Number, // degrees 0-359
});

const ChatSchema = new mongoose.Schema({
  playerId: String,
  playerName: String,
  playerColor: String,
  text: String,
  system: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

const TrailPointSchema = new mongoose.Schema({
  x: Number,
  y: Number,
});

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, unique: true },
  status: {
    type: String,
    enum: ["voting", "moving", "finished"],
    default: "voting",
  },
  turn: { type: Number, default: 1 },
  cursor: {
    x: { type: Number, default: 400 },
    y: { type: Number, default: 350 },
  },
  goal: {
    x: { type: Number, default: 720 },
    y: { type: Number, default: 80 },
  },
  trail: [TrailPointSchema],
  players: [PlayerSchema],
  votes: [VoteSchema],
  chat: [ChatSchema],
  lastTurnAngle: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Session", SessionSchema);