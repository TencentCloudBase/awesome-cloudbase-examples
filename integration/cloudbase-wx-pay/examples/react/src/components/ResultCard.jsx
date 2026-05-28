// 结果展示卡片（对齐 web index.html 返回结果 card）
export default function ResultCard({ result, outTradeNo }) {
  const { text = '点击上方按钮开始测试...', isSuccess } = result || {}
  return (
    <div className="card">
      <div className="card-title">
        返回结果
        {isSuccess === true && <span className="status status-ok" style={{ marginLeft: '8px' }}>成功</span>}
        {isSuccess === false && <span className="status status-err" style={{ marginLeft: '8px' }}>失败</span>}
      </div>
      {outTradeNo && (
        <div style={{ marginBottom: '8px' }}>
          订单号：<span className="order-no">{outTradeNo}</span>
        </div>
      )}
      <div className="result-box">
        <pre>{typeof text === 'string' ? text : JSON.stringify(text, null, 2)}</pre>
      </div>
    </div>
  )
}
