import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { attack, getRoomState, readyUp, subscribeRoomState } from "../lib/game-api";
import type { BattlePlayer, BattleRoomState, PlayerRole, ReadyState, RoomStatus } from "../types";

const FALLBACK_HOST: BattlePlayer = {
  playerId: "host-placeholder",
  nickname: "Waiting Host",
  role: "host",
  hp: 30,
  ready: false,
};

const FALLBACK_GUEST: BattlePlayer = {
  playerId: "guest-placeholder",
  nickname: "",
  role: "guest",
  hp: 30,
  ready: false,
};

function buildFallbackState(roomCode: string): BattleRoomState {
  return {
    roomCode,
    status: "waiting",
    players: [FALLBACK_HOST],
    currentTurnPlayerId: null,
    winnerPlayerId: null,
    lastEvent: null,
  };
}

function readyText(ready: boolean): ReadyState {
  return ready ? "ready" : "not-ready";
}

function getRoleText(role: PlayerRole | undefined): PlayerRole {
  return role ?? "guest";
}

function getTurnText(state: BattleRoomState): PlayerRole | "none" {
  const owner = state.players.find((item) => item.playerId === state.currentTurnPlayerId);
  return owner?.role ?? "none";
}

export default function RoomPage() {
  const navigate = useNavigate();
  const { roomCode = "" } = useParams<{ roomCode: string }>();
  const [state, setState] = useState<BattleRoomState>(() => buildFallbackState(roomCode));
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState<"ready" | "attack" | null>(null);

  const playerId = sessionStorage.getItem("battle:playerId") ?? "";
  const sessionRoomCode = sessionStorage.getItem("battle:roomCode") ?? "";

  useEffect(() => {
    if (!roomCode || !playerId || (sessionRoomCode && sessionRoomCode !== roomCode)) {
      navigate("/", { replace: true });
      return;
    }

    let unsubscribe = () => {};
    let mounted = true;

    getRoomState(roomCode, playerId)
      .then((nextState) => {
        if (mounted) {
          setState(nextState);
          setError("");
        }
      })
      .catch((err: any) => {
        if (mounted) {
          setError(err?.message || "加载房间失败");
        }
      });

    try {
      unsubscribe = subscribeRoomState(roomCode, playerId, (nextState) => {
        setState(nextState);
        setError("");
      });
    } catch (err: any) {
      setError(err?.message || "订阅房间状态失败");
    }

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [navigate, playerId, roomCode, sessionRoomCode]);

  const selfPlayer = useMemo(
    () => state.players.find((item) => item.playerId === playerId) ?? state.players[0] ?? FALLBACK_HOST,
    [playerId, state.players]
  );
  const opponentPlayer = useMemo(
    () => state.players.find((item) => item.playerId !== selfPlayer.playerId) ?? FALLBACK_GUEST,
    [selfPlayer.playerId, state.players]
  );

  const roomStatus: RoomStatus = state.status;
  const battleResult = state.winnerPlayerId
    ? state.players.find((item) => item.playerId === state.winnerPlayerId)?.role ?? ""
    : "";

  const handleReady = async () => {
    setBusyAction("ready");
    try {
      const result = await readyUp(roomCode, playerId);
      if (result.state) {
        setState(result.state);
      }
      if (result.message) {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err?.message || "准备失败");
    } finally {
      setBusyAction(null);
    }
  };

  const handleAttack = async () => {
    setBusyAction("attack");
    try {
      const result = await attack(roomCode, playerId);
      if (result.state) {
        setState(result.state);
      }
      if (result.message) {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err?.message || "攻击失败");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <main data-testid="battle-room-page" className="battle-shell room-page">
      <section className="room-header">
        <div>
          <p className="eyebrow">Battle Room</p>
          <h1>房间对战</h1>
        </div>

        <div className="room-meta">
          <div className="meta-card">
            <span className="meta-label">房间码</span>
            <strong data-testid="room-code-display">{state.roomCode || roomCode}</strong>
          </div>
          <div className="meta-card">
            <span className="meta-label">状态</span>
            <strong data-testid="room-status">{roomStatus}</strong>
          </div>
          <div className="meta-card">
            <span className="meta-label">当前回合</span>
            <strong data-testid="current-turn">{getTurnText(state)}</strong>
          </div>
          <div className="meta-card">
            <span className="meta-label">胜利方</span>
            <strong data-testid="battle-result">{battleResult}</strong>
          </div>
        </div>
      </section>

      <section className="players-grid">
        <article className="player-card">
          <p className="player-caption">我方</p>
          <h2 data-testid="self-player-name">{selfPlayer.nickname}</h2>
          <dl className="player-stats">
            <div>
              <dt>身份</dt>
              <dd data-testid="self-player-role">{getRoleText(selfPlayer.role)}</dd>
            </div>
            <div>
              <dt>生命值</dt>
              <dd data-testid="self-player-hp">{selfPlayer.hp}</dd>
            </div>
            <div>
              <dt>准备状态</dt>
              <dd data-testid="self-player-ready">{readyText(selfPlayer.ready)}</dd>
            </div>
          </dl>
        </article>

        <article className="player-card player-card-opponent">
          <p className="player-caption">对手</p>
          <h2 data-testid="opponent-player-name">{opponentPlayer.nickname}</h2>
          <dl className="player-stats">
            <div>
              <dt>身份</dt>
              <dd data-testid="opponent-player-role">{getRoleText(opponentPlayer.role)}</dd>
            </div>
            <div>
              <dt>生命值</dt>
              <dd data-testid="opponent-player-hp">{opponentPlayer.hp}</dd>
            </div>
            <div>
              <dt>准备状态</dt>
              <dd data-testid="opponent-player-ready">{readyText(opponentPlayer.ready)}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="actions-panel">
        <button
          data-testid="ready-button"
          className="primary-button"
          type="button"
          onClick={handleReady}
          disabled={busyAction !== null || selfPlayer.ready}
        >
          {busyAction === "ready" ? "提交中..." : selfPlayer.ready ? "已准备" : "准备"}
        </button>

        <button
          data-testid="attack-button"
          className="danger-button"
          type="button"
          onClick={handleAttack}
          disabled={busyAction !== null}
        >
          {busyAction === "attack" ? "攻击中..." : "攻击"}
        </button>
      </section>

      <section className="event-panel">
        <div className="event-row">
          <span className="meta-label">最近事件</span>
          <strong data-testid="last-event">{state.lastEvent ?? ""}</strong>
        </div>

        {error && (
          <div data-testid="room-error" className="inline-error">
            {error}
          </div>
        )}
      </section>
    </main>
  );
}
