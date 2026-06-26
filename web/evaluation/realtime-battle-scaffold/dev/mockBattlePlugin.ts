import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";

import type { Plugin } from "vite";

type PlayerRole = "host" | "guest";
type RoomStatus = "waiting" | "playing" | "finished";

interface MockPlayer {
  playerId: string;
  nickname: string;
  role: PlayerRole;
  hp: number;
  ready: boolean;
}

interface MockRoom {
  roomCode: string;
  status: RoomStatus;
  players: MockPlayer[];
  currentTurnPlayerId: string | null;
  winnerPlayerId: string | null;
  lastEvent: string | null;
}

interface ActionResponse {
  accepted: boolean;
  state?: MockRoom;
  message?: string;
}

const roomStore = new Map<string, MockRoom>();
const roomStreams = new Map<string, Set<ServerResponse<IncomingMessage>>>();

function buildRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function cloneRoom(room: MockRoom): MockRoom {
  return JSON.parse(JSON.stringify(room)) as MockRoom;
}

function getRole(room: MockRoom, playerId: string) {
  return room.players.find((item) => item.playerId === playerId);
}

function broadcastRoom(room: MockRoom) {
  const peers = roomStreams.get(room.roomCode);
  if (!peers || peers.size === 0) return;

  const payload = `data: ${JSON.stringify(cloneRoom(room))}\n\n`;
  for (const stream of peers) {
    stream.write(payload);
  }
}

async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? (JSON.parse(text) as T) : ({} as T);
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function setSseHeaders(res: ServerResponse) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
}

function createRoom(nickname: string) {
  const roomCode = buildRoomCode();
  const playerId = `player_${randomUUID()}`;
  const room: MockRoom = {
    roomCode,
    status: "waiting",
    players: [
      {
        playerId,
        nickname,
        role: "host",
        hp: 30,
        ready: false,
      },
    ],
    currentTurnPlayerId: null,
    winnerPlayerId: null,
    lastEvent: null,
  };

  roomStore.set(roomCode, room);
  return { roomCode, playerId };
}

function joinRoom(roomCode: string, nickname: string) {
  const room = roomStore.get(roomCode);
  if (!room) {
    throw new Error("房间不存在");
  }
  if (room.players.length >= 2) {
    throw new Error("房间已满");
  }

  const playerId = `player_${randomUUID()}`;
  room.players.push({
    playerId,
    nickname,
    role: "guest",
    hp: 30,
    ready: false,
  });
  room.lastEvent = "guest-joined";
  broadcastRoom(room);
  return { roomCode, playerId };
}

function readyUp(roomCode: string, playerId: string): ActionResponse {
  const room = roomStore.get(roomCode);
  if (!room) {
    throw new Error("房间不存在");
  }

  const player = getRole(room, playerId);
  if (!player) {
    throw new Error("玩家不存在");
  }

  player.ready = true;
  room.lastEvent = `${player.role}-ready`;

  if (room.players.length === 2 && room.players.every((item) => item.ready)) {
    room.status = "playing";
    room.currentTurnPlayerId = room.players.find((item) => item.role === "host")?.playerId ?? null;
    room.lastEvent = "battle-started";
  }

  broadcastRoom(room);
  return { accepted: true, state: cloneRoom(room) };
}

function attack(roomCode: string, playerId: string): ActionResponse {
  const room = roomStore.get(roomCode);
  if (!room) {
    throw new Error("房间不存在");
  }

  const attacker = getRole(room, playerId);
  const defender = room.players.find((item) => item.playerId !== playerId);
  if (!attacker || !defender) {
    throw new Error("玩家不存在");
  }

  if (room.status !== "playing") {
    return { accepted: false, state: cloneRoom(room), message: "游戏尚未开始或已结束" };
  }

  if (room.currentTurnPlayerId !== playerId) {
    return { accepted: false, state: cloneRoom(room), message: "当前不是你的回合" };
  }

  defender.hp = Math.max(0, defender.hp - 10);
  room.lastEvent = `${attacker.role}-attack`;

  if (defender.hp === 0) {
    room.status = "finished";
    room.currentTurnPlayerId = null;
    room.winnerPlayerId = attacker.playerId;
    room.lastEvent = `${attacker.role}-win`;
  } else {
    room.currentTurnPlayerId = defender.playerId;
  }

  broadcastRoom(room);
  return { accepted: true, state: cloneRoom(room) };
}

export function mockBattlePlugin(): Plugin {
  return {
    name: "mock-battle-plugin",
    configureServer(server) {
      server.middlewares.use("/__dev_mock/battle", async (req, res) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        try {
          if (req.method === "POST" && url.pathname === "/create") {
            const body = await readJsonBody<{ nickname: string }>(req);
            const result = createRoom(body.nickname?.trim() || "Player");
            sendJson(res, 200, result);
            return;
          }

          if (req.method === "POST" && url.pathname === "/join") {
            const body = await readJsonBody<{ roomCode: string; nickname: string }>(req);
            const result = joinRoom(body.roomCode?.trim().toUpperCase(), body.nickname?.trim() || "Player");
            sendJson(res, 200, result);
            return;
          }

          if (req.method === "GET" && url.pathname === "/state") {
            const roomCode = url.searchParams.get("roomCode")?.trim().toUpperCase() ?? "";
            const room = roomStore.get(roomCode);
            if (!room) {
              sendJson(res, 404, { message: "房间不存在" });
              return;
            }
            sendJson(res, 200, cloneRoom(room));
            return;
          }

          if (req.method === "POST" && url.pathname === "/ready") {
            const body = await readJsonBody<{ roomCode: string; playerId: string }>(req);
            sendJson(res, 200, readyUp(body.roomCode?.trim().toUpperCase(), body.playerId));
            return;
          }

          if (req.method === "POST" && url.pathname === "/attack") {
            const body = await readJsonBody<{ roomCode: string; playerId: string }>(req);
            sendJson(res, 200, attack(body.roomCode?.trim().toUpperCase(), body.playerId));
            return;
          }

          if (req.method === "GET" && url.pathname === "/stream") {
            const roomCode = url.searchParams.get("roomCode")?.trim().toUpperCase() ?? "";
            const room = roomStore.get(roomCode);
            if (!room) {
              sendJson(res, 404, { message: "房间不存在" });
              return;
            }

            setSseHeaders(res);
            const peers = roomStreams.get(roomCode) ?? new Set<ServerResponse<IncomingMessage>>();
            peers.add(res);
            roomStreams.set(roomCode, peers);
            res.write(`data: ${JSON.stringify(cloneRoom(room))}\n\n`);

            req.on("close", () => {
              peers.delete(res);
              if (peers.size === 0) {
                roomStreams.delete(roomCode);
              }
            });
            return;
          }

          sendJson(res, 404, { message: "Unknown mock route" });
        } catch (error: any) {
          sendJson(res, 400, { message: error?.message || "Mock request failed" });
        }
      });
    },
  };
}
