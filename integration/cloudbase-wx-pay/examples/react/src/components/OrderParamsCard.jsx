// 下单参数卡片（对齐 web index.html 下单参数 card）
export default function OrderParamsCard({
  payType, description, totalFee, openid, clientIp,
  loginStatus, onChange, onWxLogin,
}) {
  return (
    <div className="card">
      <div className="card-title">下单参数</div>
      <div className="form-group">
        <label>支付方式</label>
        <select value={payType} onChange={e => onChange('payType', e.target.value)}>
          <option value="jsapi">JSAPI（小程序/微信内H5）</option>
          <option value="h5">H5（非微信浏览器）</option>
          <option value="native">Native（PC 扫码）</option>
        </select>
      </div>
      <div className="form-group">
        <label>商品描述</label>
        <input
          value={description}
          onChange={e => onChange('description', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>金额（分）</label>
        <input
          type="number"
          value={totalFee}
          onChange={e => onChange('totalFee', e.target.value)}
        />
      </div>
      {payType === 'jsapi' && (
        <div className="form-group">
          <label>用户 OpenID（JSAPI 必填）</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              value={openid}
              onChange={e => onChange('openid', e.target.value)}
              placeholder="点击下方按钮自动获取"
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-green"
              onClick={onWxLogin}
              style={{ whiteSpace: 'nowrap', padding: '8px 16px' }}
            >
              🔑 微信登录
            </button>
          </div>
          {loginStatus && (
            <div
              style={{
                marginTop: '6px',
                padding: '6px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                background: loginStatus.ok ? '#e8f5e9' : '#fce4ec',
                color: loginStatus.ok ? '#2e7d32' : '#c62828',
              }}
            >
              {loginStatus.text}
            </div>
          )}
        </div>
      )}
      {payType === 'h5' && (
        <div className="form-group">
          <label>用户 IP（H5 必填）</label>
          <input
            value={clientIp}
            onChange={e => onChange('clientIp', e.target.value)}
            placeholder="如 1.2.3.4"
          />
        </div>
      )}
    </div>
  )
}
