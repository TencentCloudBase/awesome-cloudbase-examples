// 服务配置卡片（对齐 web index.html "服务配置" card）
export default function ConfigCard({ baseUrl, oauthUrl, onChange }) {
  return (
    <div className="card">
      <div className="card-title">服务配置</div>
      <div className="form-group">
        <label>支付云函数地址</label>
        <input
          className="config-input"
          value={baseUrl}
          onChange={e => onChange('baseUrl', e.target.value)}
          placeholder="https://your-domain.com/cloudrun/v1/pay"
        />
      </div>
      <div className="form-group">
        <label>
          OAuth 云函数地址{' '}
          <span style={{ fontWeight: 'normal', color: '#999' }}>(可选，默认自动推导)</span>
        </label>
        <input
          className="config-input"
          value={oauthUrl}
          onChange={e => onChange('oauthUrl', e.target.value)}
          placeholder="https://your-domain.com/oauth"
        />
      </div>
      <p className="tip">本地测试用 localhost:3000，线上替换为云函数/云托管的公网域名</p>
    </div>
  )
}
