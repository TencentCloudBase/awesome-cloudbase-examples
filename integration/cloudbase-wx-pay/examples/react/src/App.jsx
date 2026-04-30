// 主应用组件（对齐 web/app.js + web/pay.js + web/auth.js 全部逻辑）
import { useState, useCallback, useEffect, useRef } from 'react'

import { useUI } from './hooks/usePayState'
import { generateOutTradeNo, generateRefundNo, isInWechat, request, deriveOAuthUrl } from './utils/api'
import { TRADE_STATE_MAP, REFUND_STATE_MAP, getTradeStateDesc } from './constants/tradeState'
import { exchangeCodeForOpenId, startWxOAuth, refreshAccessToken } from './services/payService'

import Toast from './components/Toast'
import Loading from './components/Loading'
import Modal from './components/Modal'
import ConfigCard from './components/ConfigCard'
import OrderParamsCard from './components/OrderParamsCard'
import ActionBar from './components/ActionBar'
import PayActionCard from './components/PayActionCard'
import ResultCard from './components/ResultCard'

export default function App() {
  // ===== 服务配置 =====
  const [baseUrl, setBaseUrl] = useState('https://{envId}.ap-shanghai.app.tcloudbase.com/{routePrefix}')
  const [oauthUrl, setOauthUrl] = useState('https://{envId}.ap-shanghai.app.tcloudbase.com/oauth')

  // ===== 下单参数 =====
  const [payType, setPayType] = useState('jsapi')
  const [description, setDescription] = useState('测试商品')
  const [totalFee, setTotalFee] = useState('1')
  const [openid, setOpenid] = useState('')
  const [clientIp, setClientIp] = useState('')
  const [loginStatus, setLoginStatus] = useState(null) // { ok: bool, text: string }

  // ===== 订单状态（对齐 web/state.js window.state）=====
  const [outTradeNo, setOutTradeNo] = useState('')
  const [tradeState, setTradeState] = useState('')
  const [currentTotalFee, setCurrentTotalFee] = useState(0)
  const [outRefundNo, setOutRefundNo] = useState('')
  const isOrderSubmitting = useRef(false)
  const currentJsapiPayParams = useRef(null)
  const tokenRefreshTimer = useRef(null)

  // ===== 支付操作区 =====
  const [payAction, setPayAction] = useState(null) // { type: 'native'|'jsapi'|'h5', ... }

  // ===== 结果展示 =====
  const [result, setResult] = useState(null) // { text, isSuccess }

  // ===== UI hook =====
  const {
    toast, showToast,
    loading, showLoading, hideLoading,
    modal, showModal, handleModalConfirm, handleModalCancel,
  } = useUI()

  // ===== 配置字段统一 onChange =====
  const handleConfigChange = useCallback((key, value) => {
    if (key === 'baseUrl') setBaseUrl(value)
    if (key === 'oauthUrl') setOauthUrl(value)
  }, [])

  const handleParamChange = useCallback((key, value) => {
    if (key === 'payType') setPayType(value)
    if (key === 'description') setDescription(value)
    if (key === 'totalFee') setTotalFee(value)
    if (key === 'openid') setOpenid(value)
    if (key === 'clientIp') setClientIp(value)
  }, [])

  // ===== token 刷新定时器 =====
  const startTokenRefreshTimer = useCallback((oauthBaseUrl) => {
    if (tokenRefreshTimer.current) clearInterval(tokenRefreshTimer.current)
    tokenRefreshTimer.current = setInterval(async () => {
      const expires = sessionStorage.getItem('wx_access_token_expires')
      if (!expires) return
      const remaining = parseInt(expires) - Date.now()
      if (remaining > 0 && remaining < 30 * 60 * 1000) {
        console.log('[Auth] Access token 即将过期，自动刷新...')
        await refreshAccessToken(oauthBaseUrl)
      }
    }, 60 * 60 * 1000)
  }, [])

  useEffect(() => {
    return () => {
      if (tokenRefreshTimer.current) clearInterval(tokenRefreshTimer.current)
    }
  }, [])

  // ===== 页面加载时自动检查 OAuth 回调 code（对齐 web/app.js checkExistingLogin）=====
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const oauthCode = urlParams.get('code')
      const returnedState = urlParams.get('state')
      if (oauthCode) {
        console.log('[Auth] 检测到 OAuth 回调 code，自动换取 openid...')
        const oauthBaseUrl = deriveOAuthUrl(baseUrl, oauthUrl)
        showLoading('正在获取 OpenID...')
        exchangeCodeForOpenId(oauthBaseUrl, oauthCode, returnedState)
          .then(res => {
            hideLoading()
            handleFillOpenId(res.openid, oauthBaseUrl)
            // 清理 URL
            const url = new URL(window.location.href)
            url.searchParams.delete('code')
            url.searchParams.delete('state')
            history.replaceState(null, '', url.toString())
          })
          .catch(err => {
            hideLoading()
            showToast(err.message || '获取 OpenID 失败', 'error')
            setLoginStatus({ ok: false, text: `❌ ${err.message || '获取 OpenID 失败'}` })
          })
      }
    } catch (err) {
      console.log('[Auth] 自动登录检查出错:', err.message || err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ===== 填入 openid 并更新状态（对齐 web/auth.js fillOpenId）=====
  const handleFillOpenId = useCallback((newOpenid, oauthBaseUrl) => {
    setOpenid(newOpenid)
    setPayType('jsapi')
    setLoginStatus({ ok: true, text: `✅ 已获取 OpenID: ${newOpenid.slice(0, 12)}...${newOpenid.slice(-6)}` })
    showToast('✅ OpenID 获取成功', 'success')
    if (oauthBaseUrl) startTokenRefreshTimer(oauthBaseUrl)
  }, [showToast, startTokenRefreshTimer])

  // ===== 微信登录（对齐 web/auth.js handleWxLogin）=====
  const handleWxLogin = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('code')) {
      const oauthBaseUrl = deriveOAuthUrl(baseUrl, oauthUrl)
      showLoading('正在获取 OpenID...')
      try {
        const res = await exchangeCodeForOpenId(oauthBaseUrl, urlParams.get('code'), urlParams.get('state'))
        hideLoading()
        handleFillOpenId(res.openid, oauthBaseUrl)
        const url = new URL(window.location.href)
        url.searchParams.delete('code')
        url.searchParams.delete('state')
        history.replaceState(null, '', url.toString())
      } catch (err) {
        hideLoading()
        showToast(err.message || '获取 OpenID 失败', 'error')
        setLoginStatus({ ok: false, text: `❌ ${err.message || '获取 OpenID 失败'}` })
      }
      return
    }

    if (!isInWechat()) {
      await showModal({
        title: '⚠️ 需要在微信内操作',
        content: 'JSAPI 支付必须在微信浏览器中使用。\n\n请用微信扫描二维码打开本页面，或直接在微信中分享打开。',
        showCancel: false,
      })
      return
    }

    showLoading('正在跳转微信授权...')
    try {
      await startWxOAuth(baseUrl, oauthUrl)
      // 跳转后不会执行到这里
    } catch (err) {
      hideLoading()
      let errMsg = err.message || '登录失败'
      if (errMsg === '__NOT_IN_WECHAT__') {
        errMsg = '请在微信浏览器中使用'
      } else if (errMsg.includes('域名') || errMsg.includes('redirect_uri') || errMsg.includes('10003')) {
        errMsg = '授权回调域名未配置。\n\n请前往微信公众平台 → 设置与开发 → 公众号设置 → 功能设置 → 网页授权域名中添加当前域名。'
      } else {
        errMsg += '\n\n解决方案：\n1. 在 CloudBase 控制台配置环境变量 OAUTH_APPID\n2. 检查 OAuth 云函数是否部署\n3. 确认 OAuth 云函数地址配置正确'
      }
      setLoginStatus({ ok: false, text: `❌ ${errMsg}` })
      showToast('登录失败', 'error')
    }
  }, [baseUrl, oauthUrl, showLoading, hideLoading, showModal, showToast, handleFillOpenId])

  // ===== 下单（对齐 web/pay.js handleOrder）=====
  const handleOrder = useCallback(async () => {
    if (isOrderSubmitting.current) {
      showToast('订单提交中，请勿重复点击', 'warning')
      return
    }
    const fee = parseInt(totalFee) || 1
    if (payType === 'jsapi' && !openid) { showToast('请填写 OpenID', 'error'); return }
    if (payType === 'h5' && !clientIp) { showToast('请填写用户 IP', 'error'); return }
    if (!description) { showToast('请填写商品描述', 'error'); return }

    isOrderSubmitting.current = true
    const newOutTradeNo = generateOutTradeNo()
    setOutTradeNo(newOutTradeNo)
    setTradeState('')
    setCurrentTotalFee(fee)
    setPayAction(null)

    const body = {
      description,
      out_trade_no: newOutTradeNo,
      amount: { total: fee, currency: 'CNY' },
    }
    if (payType === 'jsapi') {
      body.payer = { openid }
      body.useServiceAccount = true
    } else if (payType === 'h5') {
      body.scene_info = { payer_client_ip: clientIp || '1.2.3.4', h5_info: { type: 'Wap' } }
    }

    const routeMap = { jsapi: '/wxpay_order', h5: '/wxpay_order_h5', native: '/wxpay_order_native' }
    showLoading('下单中...')
    try {
      const data = await request(baseUrl, routeMap[payType], body)
      hideLoading()
      setResult({ text: data, isSuccess: data.code === 0 })

      if (data.code === 0) {
        showToast('✅ 下单成功', 'success')
        if (payType === 'jsapi') {
          const payData = data.data?.data || data.data
          if (payData) {
            currentJsapiPayParams.current = payData
            setPayAction({ type: 'jsapi', params: payData })
          }
        } else if (payType === 'native') {
          const codeUrl = data.data?.code_url || data.data?.data?.code_url
          if (codeUrl) setPayAction({ type: 'native', codeUrl })
        } else if (payType === 'h5') {
          const h5Url = data.data?.h5_url || data.data?.data?.h5_url
          if (h5Url) setPayAction({ type: 'h5', h5Url })
        }
      } else {
        showToast(data.msg || '下单失败', 'error')
      }
    } catch (err) {
      hideLoading()
      setResult({ text: '请求失败: ' + err.message, isSuccess: false })
      showToast('下单失败: ' + err.message, 'error', 3000)
    } finally {
      isOrderSubmitting.current = false
    }
  }, [baseUrl, payType, description, totalFee, openid, clientIp, showLoading, hideLoading, showToast])

  // ===== 查单（对齐 web/pay.js handleQuery）=====
  const handleQuery = useCallback(async () => {
    if (!outTradeNo) { showToast('请先下单', 'warning'); return }
    showLoading('查询订单中...')
    try {
      const data = await request(baseUrl, '/wxpay_query_order_by_out_trade_no', { out_trade_no: outTradeNo })
      hideLoading()
      setResult({ text: data, isSuccess: data.code === 0 })

      if (data.code === 0 && data.data) {
        const orderData = data.data.data || data.data
        const state = orderData.trade_state
        const fee = orderData.amount?.total || currentTotalFee
        setTradeState(state)
        setCurrentTotalFee(fee)

        const info = TRADE_STATE_MAP[state]
        if (info) showToast(`${info.icon} ${info.desc}`, state === 'SUCCESS' ? 'success' : 'none')
      } else {
        await showModal({ title: '查询失败', content: data.msg || '无法获取订单状态', showCancel: false })
      }
    } catch (err) {
      hideLoading()
      setResult({ text: '查单失败:\n' + JSON.stringify(err, null, 2), isSuccess: false })
      await showModal({ title: '查询失败', content: err.message || '请稍后重试', showCancel: false })
    }
  }, [baseUrl, outTradeNo, currentTotalFee, showLoading, hideLoading, showToast, showModal])

  // ===== 关单（对齐 web/pay.js handleClose）=====
  const handleClose = useCallback(async () => {
    if (!outTradeNo) { showToast('请先下单', 'warning'); return }
    showLoading('检查订单状态...')
    try {
      const queryResult = await request(baseUrl, '/wxpay_query_order_by_out_trade_no', { out_trade_no: outTradeNo })
      hideLoading()

      if (queryResult.code === 0 && queryResult.data) {
        const orderData = queryResult.data.data || queryResult.data
        const state = orderData.trade_state
        const stateDesc = getTradeStateDesc(state)
        setTradeState(state)
        setResult({ text: `当前订单状态:\n\n状态: ${state}\n说明: ${stateDesc}\n\n${JSON.stringify(orderData, null, 2)}`, isSuccess: null })

        if (state === 'SUCCESS') {
          const goRefund = await showModal({
            title: '订单已支付',
            content: `该订单已完成支付（¥${((orderData.amount?.total || 0) / 100).toFixed(2)}）\n\n无法关闭订单，是否需要退款？`,
            confirmText: '去退款', cancelText: '取消',
          })
          if (goRefund) handleRefund()
          return
        }
        if (state === 'CLOSED') { showToast('订单已经关闭', 'success'); return }
        if (state === 'REFUND') {
          await showModal({ title: '订单已退款', content: '该订单已经发起退款，无法关闭', showCancel: false })
          return
        }
        if (state === 'NOTPAY' || state === 'USERPAYING') {
          const confirmed = await showModal({
            title: '确认关闭订单',
            content: `订单号: ${outTradeNo}\n状态: ${stateDesc}\n\n确认要关闭吗？关闭后不可恢复。`,
            confirmText: '确认关闭', danger: true,
          })
          if (!confirmed) return

          showLoading('正在关闭订单...')
          const closeResult = await request(baseUrl, '/wxpay_close_order', { out_trade_no: outTradeNo })
          hideLoading()
          setResult({ text: `关单结果:\n\n${JSON.stringify(closeResult, null, 2)}`, isSuccess: closeResult.code === 0 })

          if (closeResult.code === 0) {
            setTradeState('CLOSED')
            showToast('✅ 订单已关闭', 'success')
          } else {
            await showModal({ title: '关闭失败', content: closeResult.msg || '未知错误', showCancel: false })
          }
          return
        }
        await showModal({ title: '无法关闭订单', content: `当前订单状态为"${stateDesc}"，不支持关闭操作`, showCancel: false })
      } else {
        await showModal({ title: '查询订单失败', content: queryResult.msg || '无法获取订单状态', showCancel: false })
      }
    } catch (err) {
      hideLoading()
      let title = '操作失败'
      let content = err.msg || err.message || '未知错误'
      if (content.includes('商户订单号错误')) {
        title = '提示'
        content = '订单状态已变更，无法关闭。\n可能原因：订单已支付、已关闭或已退款。'
      }
      setResult({ text: '操作失败:\n' + JSON.stringify(err, null, 2), isSuccess: false })
      await showModal({ title, content, showCancel: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, outTradeNo, showLoading, hideLoading, showToast, showModal])

  // ===== 退款（对齐 web/pay.js handleRefund）=====
  const handleRefund = useCallback(async () => {
    if (!outTradeNo) { showToast('请先下单', 'warning'); return }
    showLoading('查询订单中...')
    try {
      const queryResult = await request(baseUrl, '/wxpay_query_order_by_out_trade_no', { out_trade_no: outTradeNo })
      hideLoading()

      if (queryResult.code === 0 && queryResult.data) {
        const orderData = queryResult.data.data || queryResult.data
        const state = orderData.trade_state
        const fee = orderData.amount?.total || currentTotalFee
        setTradeState(state)
        setCurrentTotalFee(fee)

        if (state !== 'SUCCESS') {
          const stateDesc = orderData.trade_state_desc || getTradeStateDesc(state)
          await showModal({ title: '无法退款', content: `订单状态为"${stateDesc}"，只有已支付的订单才能退款`, showCancel: false })
          return
        }

        const confirmed = await showModal({
          title: '确认退款',
          content: `订单金额：¥${(fee / 100).toFixed(2)}\n退款金额：¥${(fee / 100).toFixed(2)}\n\n退款将原路返回到支付账户，确认要退款吗？`,
          confirmText: '确认退款', confirmColor: '#07c160',
        })
        if (!confirmed) return

        showLoading('正在退款...')
        const newRefundNo = generateRefundNo()
        setOutRefundNo(newRefundNo)

        // ⚠️ 安全警告：生产环境中退款金额必须从后端查询实际订单金额，严禁使用前端传值，此处仅为示例演示。
        const refundResult = await request(baseUrl, '/wxpay_refund', {
          out_trade_no: outTradeNo,
          out_refund_no: newRefundNo,
          reason: '用户申请退款',
          amount: { total: fee, refund: fee, currency: 'CNY' },
        })
        hideLoading()
        setResult({ text: refundResult, isSuccess: refundResult.code === 0 })

        if (refundResult.code === 0) {
          const refundData = refundResult.data?.data || refundResult.data
          const refundStatus = refundData?.status
          let title = '✅ 退款成功'
          let content = `退款单号: ${newRefundNo}\n金额: ¥${(fee / 100).toFixed(2)}`
          if (refundStatus === 'SUCCESS') content += '\n\n退款已到账'
          else if (refundStatus === 'PROCESSING') { title = '⏳ 退款处理中'; content += '\n\n退款正在处理，请稍后查询' }

          const goQuery = await showModal({ title, content, confirmText: '查询退款', cancelText: '知道了' })
          if (goQuery) handleRefundQuery()
        } else {
          await showModal({ title: '退款失败', content: refundResult.msg || '退款申请失败，请稍后重试', showCancel: false })
        }
      } else {
        await showModal({ title: '查询失败', content: queryResult.msg || '无法查询订单状态', showCancel: false })
      }
    } catch (err) {
      hideLoading()
      let errorMsg = err.msg || err.message || '退款失败'
      if (err.code === 'PARAM_ERROR') errorMsg = '参数错误：' + errorMsg
      else if (err.code === 'FREQUENCY_LIMITED') errorMsg = '操作过于频繁，请稍后再试'
      else if (err.code === 'NOT_ENOUGH') errorMsg = '商户账户余额不足'
      setResult({ text: '退款失败:\n' + JSON.stringify(err, null, 2), isSuccess: false })
      await showModal({ title: '退款失败', content: errorMsg, showCancel: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, outTradeNo, currentTotalFee, showLoading, hideLoading, showToast, showModal])

  // ===== 退款查询（对齐 web/pay.js handleRefundQuery）=====
  const handleRefundQuery = useCallback(async () => {
    if (!outRefundNo) { showToast('请先发起退款', 'warning'); return }
    showLoading('查询退款中...')
    try {
      const data = await request(baseUrl, '/wxpay_refund_query', { out_refund_no: outRefundNo })
      hideLoading()
      setResult({ text: data, isSuccess: data.code === 0 })

      if (data.code === 0) {
        const refundData = data.data?.data || data.data
        const refundStatus = refundData?.status
        const info = REFUND_STATE_MAP[refundStatus]
        if (info) showToast(`${info.icon} ${info.desc}`, refundStatus === 'SUCCESS' ? 'success' : 'none')
      } else {
        await showModal({ title: '查询失败', content: data.msg || '退款查询失败', showCancel: false })
      }
    } catch (err) {
      hideLoading()
      setResult({ text: '退款查询失败:\n' + JSON.stringify(err, null, 2), isSuccess: false })
      await showModal({ title: '查询失败', content: err.msg || err.message || '请稍后重试', showCancel: false })
    }
  }, [baseUrl, outRefundNo, showLoading, hideLoading, showToast, showModal])

  // ===== JSAPI 调起微信支付（对齐 web/pay.js handleJsapiPay）=====
  const handleJsapiPay = useCallback(async () => {
    if (!currentJsapiPayParams.current) {
      showToast('请先下单获取支付参数', 'error')
      return
    }
    if (!isInWechat()) {
      await showModal({
        title: '⚠️ 非微信环境',
        content: '当前不在微信浏览器中，无法调起支付。\n\n请在微信中打开本页面，或复制上方支付参数到微信内使用。\n\n如需在 PC 端测试，请切换为 Native 扫码支付。',
        showCancel: false,
      })
      return
    }

    const params = currentJsapiPayParams.current

    function onBridgeReady() {
      window.WeixinJSBridge.invoke('getBrandWCPayRequest', {
        appId: params.appId || params.appid || '',
        timeStamp: params.timeStamp || params.timestamp || '',
        nonceStr: params.nonceStr || params.nonce_str || '',
        package: params.package || ('prepay_id=' + (params.prepay_id || '')),
        signType: params.signType || params.sign_type || 'RSA',
        paySign: params.paySign || params.pay_sign || '',
      }, function(res) {
        if (res.err_msg === 'get_brand_wcpay_request:ok') {
          showToast('🎉 支付成功', 'success')
          setResult({ text: '✅ 支付成功！正在查询订单确认...', isSuccess: true })
          setTimeout(() => handleQuery(), 1000)
        } else if (res.err_msg === 'get_brand_wcpay_request:cancel') {
          showToast('已取消支付', 'none')
          setResult({ text: '用户取消了支付', isSuccess: false })
        } else {
          showToast('支付失败', 'error')
          setResult({ text: '支付失败: ' + JSON.stringify(res), isSuccess: false })
        }
      })
    }

    if (typeof window.WeixinJSBridge === 'undefined') {
      document.addEventListener('WeixinJSBridgeReady', onBridgeReady, false)
      showLoading('等待微信 JSBridge 初始化...')
    } else {
      onBridgeReady()
    }
  }, [showToast, showModal, showLoading, handleQuery])

  return (
    <div className="container">
      <h1>微信支付测试</h1>
      <p className="subtitle">pay-common 模板 Web 端测试页</p>

      {/* 安全提示横幅 */}
      <div style={{
        background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px',
        padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#856404',
      }}>
        ⚠️ <strong>安全提示</strong>：本页面仅供本地开发测试使用，请勿部署到公网。生产环境请务必在后端校验请求来源并启用鉴权。
      </div>

      <ConfigCard baseUrl={baseUrl} oauthUrl={oauthUrl} onChange={handleConfigChange} />

      <OrderParamsCard
        payType={payType}
        description={description}
        totalFee={totalFee}
        openid={openid}
        clientIp={clientIp}
        loginStatus={loginStatus}
        onChange={handleParamChange}
        onWxLogin={handleWxLogin}
      />

      <ActionBar
        onOrder={handleOrder}
        onQuery={handleQuery}
        onClose={handleClose}
        onRefund={handleRefund}
        onRefundQuery={handleRefundQuery}
        hasOrder={!!outTradeNo}
        hasRefund={!!outRefundNo}
        tradeState={tradeState}
        outTradeNo={outTradeNo}
      />

      {payAction && (
        <PayActionCard
          payAction={payAction}
          onJsapiPay={handleJsapiPay}
          onQuery={handleQuery}
        />
      )}

      <ResultCard result={result} outTradeNo={outTradeNo} />

      <Toast toast={toast} />
      <Loading loading={loading} />
      <Modal modal={modal} onConfirm={handleModalConfirm} onCancel={handleModalCancel} />
    </div>
  )
}
