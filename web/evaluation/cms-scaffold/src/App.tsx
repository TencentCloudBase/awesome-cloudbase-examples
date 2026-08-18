import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ArticleListPage from "./pages/ArticleListPage";
import ArticleEditorPage from "./pages/ArticleEditorPage";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 登录页 - 公开 */}
        <Route path="/login" element={<LoginPage />} />

        {/* 注册页 - 公开 */}
        <Route path="/register" element={<RegisterPage />} />

        {/* 文章列表 - 需登录 */}
        <Route
          path="/articles"
          element={
            <ProtectedRoute>
              <ArticleListPage />
            </ProtectedRoute>
          }
        />

        {/* 新建文章 - 需登录 */}
        <Route
          path="/articles/new"
          element={
            <ProtectedRoute>
              <ArticleEditorPage />
            </ProtectedRoute>
          }
        />

        {/* 编辑文章 - 需登录 */}
        <Route
          path="/articles/:id/edit"
          element={
            <ProtectedRoute>
              <ArticleEditorPage />
            </ProtectedRoute>
          }
        />

        {/* 默认跳转到文章列表 */}
        <Route path="*" element={<Navigate to="/articles" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
