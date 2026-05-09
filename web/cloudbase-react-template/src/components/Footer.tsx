const Footer = () => {
  return (
    <footer className="border-t border-gray-200 bg-white py-8">
      <div className="container mx-auto px-4 text-center">
        <div className="flex justify-center gap-4">
          <a
            href="https://github.com/TencentCloudBase/awesome-cloudbase-examples"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-900"
          >
            GitHub
          </a>
          <a
            href="https://docs.cloudbase.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-900"
          >
            文档
          </a>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          基于 React + Vite + CloudBase 构建
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Copyright © {new Date().getFullYear()} - All rights reserved
        </p>
      </div>
    </footer>
  );
};

export default Footer;
