// Toast 对齐 web/ui.js showToast
const ICON_MAP = {
  success: '✅', error: '❌', warning: '⚠️', loading: '⏳', info: 'ℹ️', none: '',
}

export default function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className="toast-overlay">
      <div className="toast-box">
        {ICON_MAP[toast.icon] && <span className="toast-icon">{ICON_MAP[toast.icon]}</span>}
        <span className="toast-text">{toast.title}</span>
      </div>
    </div>
  )
}
