import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import TodoListPage from "./pages/TodoListPage";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 登录 - 公开 */}
        <Route path="/login" element={<LoginPage />} />

        {/* 注册 - 公开 */}
        <Route path="/register" element={<RegisterPage />} />

        {/* Todo 列表 - 需登录 */}
        <Route
          path="/todos"
          element={
            <ProtectedRoute>
              <TodoListPage />
            </ProtectedRoute>
          }
        />

        {/* 默认跳转 */}
        <Route path="*" element={<Navigate to="/todos" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
