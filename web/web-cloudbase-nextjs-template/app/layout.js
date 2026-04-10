import './globals.css'

export const metadata = {
  title: 'CloudBase Next.js 模板',
  description: '基于 Next.js SSG 和腾讯云开发的现代化 Web 应用模板',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
      </body>
    </html>
  )
}
