// Loading 对齐 web/ui.js showLoading
export default function Loading({ loading }) {
  if (!loading) return null
  return (
    <div className="loading-overlay">
      <div className="loading-box">
        <div className="loading-spinner" />
        <div className="loading-text">{loading}</div>
      </div>
    </div>
  )
}
