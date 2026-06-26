// 订单状态栏（对齐 web pay.js updateOrderStatusBar）
import { TRADE_STATE_MAP } from '../constants/tradeState'

const COLOR_MAP = {
  success: '#e8f5e9',
  warning: '#fff3e0',
  error: '#fce4ec',
  processing: '#f3e5f5',
  info: '#e3f2fd',
}

export default function OrderStatusBar({ tradeState, outTradeNo }) {
  if (!tradeState) return null
  const info = TRADE_STATE_MAP[tradeState] || { icon: '❓', desc: tradeState, tag: 'info', color: '#999' }
  const bg = COLOR_MAP[info.tag] || '#f0f9ff'

  return (
    <div className="order-status-bar" style={{ background: bg, borderLeftColor: info.color || '#999' }}>
      <span className="order-status-icon">{info.icon}</span>
      <div>
        <div className="order-status-text">{info.desc}</div>
        <div className="order-status-desc">订单号: {outTradeNo || '-'}</div>
      </div>
    </div>
  )
}
