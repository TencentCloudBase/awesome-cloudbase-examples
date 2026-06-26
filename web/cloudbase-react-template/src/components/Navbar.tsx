import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link to="/" className="text-xl font-semibold text-gray-900">
          CloudBase + React
        </Link>
        <a
          href="https://docs.cloudbase.net"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          文档
        </a>
      </nav>
    </header>
  );
};

export default Navbar;
