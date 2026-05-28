// 支付操作区（二维码 / H5 跳转 / JSAPI 调起）
// 对齐 web index.html payActionCard
import { useEffect, useRef } from 'react'
import qrcode from 'qrcode-generator'

export default function PayActionCard({ payAction, onJsapiPay, onQuery }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (payAction?.type !== 'native' || !payAction?.codeUrl) return
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const qr = qrcode(0, 'M')
      qr.addData(payAction.codeUrl)
      qr.make()
      const moduleCount = qr.getModuleCount()
      const margin = 4
      const cellSize = Math.floor(256 / (moduleCount + margin * 2))
      const canvasSize = cellSize * (moduleCount + margin * 2)
      canvas.width = canvasSize
      canvas.height = canvasSize
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvasSize, canvasSize)
      ctx.fillStyle = '#000000'
      for (let r = 0; r < moduleCount; r++)
        for (let c = 0; c < moduleCount; c++)
          if (qr.isDark(r, c))
            ctx.fillRect((c + margin) * cellSize, (r + margin) * cellSize, cellSize, cellSize)
    } catch (err) {
      console.error('二维码生成失败:', err)
    }
  }, [payAction])

  if (!payAction) return null

  return (
    <div className="card">
      <div className="card-title">
        {payAction.type === 'native' ? 'Native 扫码支付' : payAction.type === 'jsapi' ? 'JSAPI 支付' : 'H5 支付'}
      </div>

      {payAction.type === 'native' && (
        <div style={{ textAlign: 'center' }}>
          <canvas ref={canvasRef} width="256" height="256" style={{ border: '1px solid #eee', borderRadius: '8px' }} />
          <p className="tip" style={{ marginTop: '10px' }}>打开微信扫描二维码完成支付</p>
          <button className="btn btn-blue" onClick={onQuery} style={{ marginTop: '10px', width: 'auto', padding: '8px 24px' }}>
            扫码后点此查单确认
          </button>
        </div>
      )}

      {payAction.type === 'jsapi' && (
        <div style={{ textAlign: 'center' }}>
          <button className="btn btn-green" onClick={onJsapiPay} style={{ width: 'auto', padding: '14px 48px', fontSize: '16px' }}>
            📱 调起微信支付
          </button>
          <p className="tip" style={{ marginTop: '10px' }}>需在<strong>微信浏览器</strong>内打开本页面才能调起支付</p>
          <div style={{ marginTop: '12px', textAlign: 'left' }}>
            <p style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>调起支付参数（如非微信内打开，可复制到微信内使用）：</p>
            <div className="result-box">
              <pre style={{ fontSize: '12px' }}>{JSON.stringify(payAction.params, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {payAction.type === 'h5' && (
        <div style={{ textAlign: 'center' }}>
          <a
            href={payAction.h5Url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-green"
            style={{ display: 'inline-block', textDecoration: 'none', padding: '12px 32px' }}
          >
            点击跳转微信支付
          </a>
          <p className="tip" style={{ marginTop: '10px' }}>需在手机浏览器中打开，会自动拉起微信 APP</p>
        </div>
      )}
    </div>
  )
}
