import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Laptop, Moon, Sun } from "lucide-react";

const DAISY_THEME = "lofi";

const Navbar = () => {
  const location = useLocation();
  const [themePreference, setThemePreference] = useState<
    "light" | "dark" | "system"
  >(() => {
    if (typeof window === "undefined") return "system";
    const stored = window.localStorage.getItem("theme-preference");
    return stored === "light" || stored === "dark" || stored === "system"
      ? stored
      : "system";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const resolveTheme = () =>
      themePreference === "system"
        ? mediaQuery.matches
          ? "dark"
          : DAISY_THEME
        : themePreference === "light"
          ? DAISY_THEME
          : themePreference;

    const applyTheme = () => {
      document.documentElement.setAttribute("data-theme", resolveTheme());
    };

    applyTheme();
    if (themePreference === "system") {
      mediaQuery.addEventListener("change", applyTheme);
      return () => mediaQuery.removeEventListener("change", applyTheme);
    }

    return () => {};
  }, [themePreference]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("theme-preference", themePreference);
  }, [themePreference]);

  const handleThemeChange = (value: "light" | "dark" | "system") => {
    setThemePreference(value);
  };

  const ThemeIcon =
    themePreference === "light"
      ? Sun
      : themePreference === "dark"
        ? Moon
        : Laptop;

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-30 border-b border-base-300 bg-base-100/90 backdrop-blur">
      <nav className="navbar mx-auto max-w-6xl px-4">
        <div className="navbar-start">
          <div className="dropdown">
            <button
              type="button"
              tabIndex={0}
              className="btn btn-ghost lg:hidden"
              aria-label="打开导航菜单"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <ul
              tabIndex={0}
              className="menu dropdown-content mt-3 w-52 rounded-box border border-base-200 bg-base-100 p-2 shadow"
            >
              <li>
                <Link to="/" className={isActive("/") ? "active" : ""}>
                  首页
                </Link>
              </li>
              {/* 可以在这里添加新的链接 */}
            </ul>
          </div>
          <Link
            to="/"
            className="btn btn-ghost px-2 text-xl font-semibold normal-case"
          >
            <span className="text-primary">CloudBase + React</span>
          </Link>
        </div>
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            <li>
              <Link to="/" className={isActive("/") ? "active" : ""}>
                首页
              </Link>
            </li>
            {/* 可以在这里添加新的链接 */}
          </ul>
        </div>
        <div className="navbar-end">
          <div className="dropdown dropdown-end">
            <button
              type="button"
              tabIndex={0}
              className="btn btn-ghost btn-square"
              aria-label="切换主题"
            >
              <ThemeIcon />
            </button>
            <ul className="menu menu-sm dropdown-content rounded-box border border-base-200 bg-base-100 shadow">
              <li>
                <button
                  type="button"
                  className={themePreference === "light" ? "active" : ""}
                  onClick={() => handleThemeChange("light")}
                  aria-label="切换到浅色模式"
                >
                  <Sun className="h-4 w-4" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={themePreference === "dark" ? "active" : ""}
                  onClick={() => handleThemeChange("dark")}
                  aria-label="切换到深色模式"
                >
                  <Moon className="h-4 w-4" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={themePreference === "system" ? "active" : ""}
                  onClick={() => handleThemeChange("system")}
                  aria-label="切换到系统模式"
                >
                  <Laptop className="h-4 w-4" />
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
