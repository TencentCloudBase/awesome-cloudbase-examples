import { useEffect, useState } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import cloudbase from "./utils/cloudbase";
// @ts-ignore
import Sidebar from "./components/Sidebar";
// @ts-ignore
import CRMDashboard from "./pages/CRMDashboard";
// @ts-ignore
import CustomersPage from "./pages/CustomersPage";
// @ts-ignore
import OpportunitiesPage from "./pages/OpportunitiesPage";
// @ts-ignore
import ContactsPage from "./pages/ContactsPage";

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初始化登录
    const initAuth = async () => {
      try {
        console.log("开始登录...");
        await cloudbase.ensureLogin();
        console.log("登录成功");
      } catch (error) {
        console.error("登录失败", error);
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
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 ml-64">
          <Routes>
            <Route path="/" element={<CRMDashboard />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/opportunities" element={<OpportunitiesPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="*" element={<CRMDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
