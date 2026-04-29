// 操作按钮区（对齐 web index.html 操作 card）
import OrderStatusBar from './OrderStatusBar'

export default function ActionBar({
  onOrder, onQuery, onClose, onRefund, onRefundQuery,
  hasOrder, hasRefund,
  tradeState, outTradeNo,
}) {
  return (
    <div className="card">
      <div className="card-title">操作</div>
      {tradeState && <OrderStatusBar tradeState={tradeState} outTradeNo={outTradeNo} />}
      <div className="btn-row">
        <button className="btn btn-green" onClick={onOrder}>下单</button>
        <button className="btn btn-blue" onClick={onQuery} disabled={!hasOrder}>查单</button>
        <button className="btn btn-red" onClick={onClose} disabled={!hasOrder}>关单</button>
      </div>
      <div className="btn-row" style={{ marginTop: '10px' }}>
        <button className="btn btn-orange" onClick={onRefund} disabled={!hasOrder}>退款</button>
        <button className="btn btn-gray" onClick={onRefundQuery} disabled={!hasRefund}>退款查询</button>
      </div>
    </div>
  )
}
