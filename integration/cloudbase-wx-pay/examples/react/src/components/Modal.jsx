// Modal 对齐 web/ui.js showModal
export default function Modal({ modal, onConfirm, onCancel }) {
  if (!modal) return null
  const { title, content, showCancel = true, confirmText = '确定', cancelText = '取消', confirmColor, danger = false } = modal
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-title">{title}</div>
        <div className="modal-content">{content}</div>
        <div className="modal-btns">
          {showCancel && (
            <button className="modal-btn modal-btn-cancel" onClick={onCancel}>{cancelText}</button>
          )}
          <button
            className={`modal-btn modal-btn-confirm${danger ? ' danger' : ''}`}
            style={confirmColor ? { color: confirmColor } : undefined}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
