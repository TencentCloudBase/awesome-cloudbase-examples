import { useState } from 'react'
import './App.css'

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [loading, setLoading] = useState(false)

  // 发送验证码
  const handleSendCode = async () => {
    if (!email) return
    setLoading(true)
    try {
      // TODO: 调用发送验证码 API
      // await sendVerificationCode(email)
      console.log('发送验证码到:', email)
      setCodeSent(true)
    } catch (error) {
      console.error('发送验证码失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 注册
  const handleRegister = async () => {
    if (!email || !code) return
    setLoading(true)
    try {
      // TODO: 调用注册 API
      // await register(username, password, email, code)
      console.log('注册:', { username, password, email, code })
    } catch (error) {
      console.error('注册失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-container" data-testid="register-container">
      <h1 data-testid="register-title">邮箱注册</h1>

      <div className="form-group" data-testid="username-form-group">
        <input
          type="text"
          placeholder="请输入用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
          data-testid="username-input"
        />
      </div>

      <div className="form-group" data-testid="password-form-group">
        <input
          type="password"
          placeholder="请输入密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          data-testid="password-input"
        />
      </div>

      <div className="form-group" data-testid="email-form-group">
        <input
          type="email"
          placeholder="请输入邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          data-testid="email-input"
        />
        <button
          onClick={handleSendCode}
          disabled={!email || loading}
          className="send-code-btn"
          data-testid="send-code-btn"
        >
          {codeSent ? '重新发送' : '发送验证码'}
        </button>
      </div>

      <div className="form-group" data-testid="code-form-group">
        <input
          type="text"
          placeholder="请输入验证码"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={loading}
          data-testid="verification-code-input"
        />
      </div>

      <button
        onClick={handleRegister}
        disabled={!email || !code || loading}
        className="register-btn"
        data-testid="register-btn"
      >
        {loading ? '处理中...' : '注册'}
      </button>
    </div>
  )
}

export default App
