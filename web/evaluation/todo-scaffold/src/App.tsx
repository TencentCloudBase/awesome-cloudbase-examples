import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import TodoListPage from "./pages/TodoListPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/todos" element={<TodoListPage />} />
        <Route path="*" element={<Navigate to="/todos" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
