export default function Footer() {
  return (
    <footer className="footer footer-center p-10 bg-base-200 text-base-content">
      <div>
        <p className="mt-4">基于 Next.js + CloudBase 构建</p>
        <div className="mt-4">
          <a href="https://github.com/TencentCloudBase/CloudBase-AI-ToolKit" target="_blank" rel="noopener noreferrer">
            <img
              src="https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg"
              alt="Powered by CloudBase"
              className="h-8"
            />
          </a>
        </div>
        <p className="text-xs opacity-50 mt-2">Copyright © {new Date().getFullYear()} - All rights reserved</p>
      </div>
    </footer>
  )
}
