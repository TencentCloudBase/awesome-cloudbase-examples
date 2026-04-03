import { app } from "./backend";
import type {
  ActionResult,
  BattleRoomState,
  CreateRoomResult,
  JoinRoomResult,
} from "../types";

/**
 * 对战房间接口层
 *
 * TODO: 使用你选择的后端客户端实现以下函数。
 * 所有函数签名和返回值类型已固定，请勿修改。
 */

const MOCK_BASE = "/__dev_mock/battle";
const USE_LOCAL_MOCK = import.meta.env.VITE_USE_LOCAL_MOCK === "1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${MOCK_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = (await response.json()) as { message?: string } & T;
  if (!response.ok) {
    throw new Error(data.message || "请求失败");
  }
  return data;
}

export async function createRoom(nickname: string): Promise<CreateRoomResult> {
  if (USE_LOCAL_MOCK) {
    return request<CreateRoomResult>("/create", {
      method: "POST",
      body: JSON.stringify({ nickname }),
    });
  }
  void app;
  void nickname;
  throw new Error("createRoom() 尚未实现");
}

export async function joinRoom(
  roomCode: string,
  nickname: string
): Promise<JoinRoomResult> {
  if (USE_LOCAL_MOCK) {
    return request<JoinRoomResult>("/join", {
      method: "POST",
      body: JSON.stringify({ roomCode, nickname }),
    });
  }
  void app;
  void roomCode;
  void nickname;
  throw new Error("joinRoom() 尚未实现");
}

export async function getRoomState(
  roomCode: string,
  playerId: string
): Promise<BattleRoomState> {
  if (USE_LOCAL_MOCK) {
    return request<BattleRoomState>(
      `/state?roomCode=${encodeURIComponent(roomCode)}&playerId=${encodeURIComponent(playerId)}`
    );
  }
  void app;
  void roomCode;
  void playerId;
  throw new Error("getRoomState() 尚未实现");
}

export async function readyUp(
  roomCode: string,
  playerId: string
): Promise<ActionResult> {
  if (USE_LOCAL_MOCK) {
    return request<ActionResult>("/ready", {
      method: "POST",
      body: JSON.stringify({ roomCode, playerId }),
    });
  }
  void app;
  void roomCode;
  void playerId;
  throw new Error("readyUp() 尚未实现");
}

export async function attack(
  roomCode: string,
  playerId: string
): Promise<ActionResult> {
  if (USE_LOCAL_MOCK) {
    return request<ActionResult>("/attack", {
      method: "POST",
      body: JSON.stringify({ roomCode, playerId }),
    });
  }
  void app;
  void roomCode;
  void playerId;
  throw new Error("attack() 尚未实现");
}

export function subscribeRoomState(
  roomCode: string,
  playerId: string,
  onStateChange: (state: BattleRoomState) => void
): () => void {
  if (USE_LOCAL_MOCK) {
    const stream = new EventSource(
      `${MOCK_BASE}/stream?roomCode=${encodeURIComponent(roomCode)}&playerId=${encodeURIComponent(playerId)}`
    );
    stream.onmessage = (event) => {
      onStateChange(JSON.parse(event.data) as BattleRoomState);
    };
    return () => stream.close();
  }
  void app;
  void roomCode;
  void playerId;
  void onStateChange;
  throw new Error("subscribeRoomState() 尚未实现");
}
