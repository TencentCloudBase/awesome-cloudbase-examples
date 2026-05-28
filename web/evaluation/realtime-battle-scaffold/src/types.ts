export type RoomStatus = "waiting" | "playing" | "finished";
export type PlayerRole = "host" | "guest";
export type ReadyState = "ready" | "not-ready";

export interface BattlePlayer {
  playerId: string;
  nickname: string;
  role: PlayerRole;
  hp: number;
  ready: boolean;
}

export interface BattleRoomState {
  roomCode: string;
  status: RoomStatus;
  players: BattlePlayer[];
  currentTurnPlayerId: string | null;
  winnerPlayerId: string | null;
  lastEvent: string | null;
}

export interface CreateRoomResult {
  roomCode: string;
  playerId: string;
}

export interface JoinRoomResult {
  roomCode: string;
  playerId: string;
}

export interface ActionResult {
  accepted: boolean;
  state?: BattleRoomState;
  message?: string;
}
