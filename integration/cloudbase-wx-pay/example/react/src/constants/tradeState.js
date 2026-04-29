// 对齐 web/ui.js 的 TRADE_STATE_MAP / REFUND_STATE_MAP

export const TRADE_STATE_MAP = {
  SUCCESS:    { desc: '支付成功',   icon: '✅', tag: 'success',    bgColor: '#e8f5e9' },
  REFUND:     { desc: '转入退款',   icon: '💰', tag: 'processing', bgColor: '#f3e5f5' },
  NOTPAY:     { desc: '未支付',     icon: '⏳', tag: 'warning',    bgColor: '#fff3e0' },
  CLOSED:     { desc: '已关闭',     icon: '❌', tag: 'error',      bgColor: '#fce4ec' },
  REVOKED:    { desc: '已撤销',     icon: '🚫', tag: 'error',      bgColor: '#fce4ec' },
  USERPAYING: { desc: '用户支付中', icon: '⏳', tag: 'info',       bgColor: '#e3f2fd' },
  PAYERROR:   { desc: '支付失败',   icon: '❌', tag: 'error',      bgColor: '#fce4ec' },
}

export const REFUND_STATE_MAP = {
  SUCCESS:    { desc: '退款成功',   icon: '✅', tag: 'success' },
  PROCESSING: { desc: '退款处理中', icon: '⏳', tag: 'processing' },
  ABNORMAL:   { desc: '退款异常',   icon: '⚠️', tag: 'warning' },
  CLOSED:     { desc: '退款关闭',   icon: '❌', tag: 'error' },
}

export function getTradeStateDesc(state) {
  return TRADE_STATE_MAP[state]?.desc || '未知状态'
}
