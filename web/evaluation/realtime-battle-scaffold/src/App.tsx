import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import LobbyPage from "./pages/LobbyPage";
import RoomPage from "./pages/RoomPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LobbyPage />} />
        <Route path="/room/:roomCode" element={<RoomPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
