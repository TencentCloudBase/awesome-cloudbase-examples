import { useEffect, useState } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import cloudbase from "./utils/cloudbase";
import HomePage from "./pages/HomePage";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初始化登录
    const initAuth = async () => {
      try {
        console.log("开始检查登录态...");
        await cloudbase.checkLogin();
        console.log("检查登录态成功");
      } catch (error) {
        console.error("检查登录态失败", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-base-200 text-base-content">
        <div className="loading loading-spinner loading-lg text-primary" />
        <p className="mt-4 text-sm opacity-70">加载中...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="flex min-h-screen flex-col bg-base-200 text-base-content">
        <Navbar />
        <main className="grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            {/* 可以在这里添加新的路由 */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
