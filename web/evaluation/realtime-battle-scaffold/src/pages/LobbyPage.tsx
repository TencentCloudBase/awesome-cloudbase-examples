import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { createRoom, joinRoom } from "../lib/game-api";

function persistSession(roomCode: string, playerId: string) {
  sessionStorage.setItem("battle:roomCode", roomCode);
  sessionStorage.setItem("battle:playerId", playerId);
}

export default function LobbyPage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleCreateRoom = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setCreating(true);

    try {
      const result = await createRoom(nickname.trim());
      persistSession(result.roomCode, result.playerId);
      navigate(`/room/${result.roomCode}`);
    } catch (err: any) {
      setError(err?.message || "创建房间失败");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    setError("");
    setJoining(true);

    try {
      const result = await joinRoom(roomCode.trim(), nickname.trim());
      persistSession(result.roomCode, result.playerId);
      navigate(`/room/${result.roomCode}`);
    } catch (err: any) {
      setError(err?.message || "加入房间失败");
    } finally {
      setJoining(false);
    }
  };

  return (
    <main data-testid="battle-lobby-page" className="battle-shell lobby-page">
      <section className="hero-card">
        <p className="eyebrow">Realtime Battle</p>
        <h1>1v1 联机对战</h1>
        <p className="hero-copy">
          输入昵称，创建房间或加入现有房间。页面结构和交互契约已经固定，
          你只需要把它接上真正的后端联机能力。
        </p>
      </section>

      <section className="panel-grid">
        <form className="panel-card" onSubmit={handleCreateRoom}>
          <h2>创建房间</h2>
          <label className="field-label" htmlFor="nickname-input">
            昵称
          </label>
          <input
            data-testid="nickname-input"
            id="nickname-input"
            className="field-input"
            type="text"
            placeholder="请输入玩家昵称"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            maxLength={24}
          />

          <button
            data-testid="create-room-button"
            className="primary-button"
            type="submit"
            disabled={creating || !nickname.trim()}
          >
            {creating ? "创建中..." : "创建房间"}
          </button>
        </form>

        <section className="panel-card">
          <h2>加入房间</h2>
          <label className="field-label" htmlFor="room-code-input">
            房间码
          </label>
          <input
            data-testid="room-code-input"
            id="room-code-input"
            className="field-input"
            type="text"
            placeholder="请输入房间码"
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
            maxLength={12}
          />

          <button
            data-testid="join-room-button"
            className="secondary-button"
            type="button"
            disabled={joining || !nickname.trim() || !roomCode.trim()}
            onClick={handleJoinRoom}
          >
            {joining ? "加入中..." : "加入房间"}
          </button>
        </section>
      </section>

      {error && (
        <div data-testid="lobby-error" className="inline-error">
          {error}
        </div>
      )}
    </main>
  );
}
