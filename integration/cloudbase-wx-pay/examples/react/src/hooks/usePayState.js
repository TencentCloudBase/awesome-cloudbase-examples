// 全局 UI 状态 hook（Toast / Loading / Modal）
// 对齐 web/ui.js 的 showToast / showLoading / showModal

import { useState, useCallback, useRef } from 'react'

export function useUI() {
  const [toast, setToast] = useState(null)      // { title, icon }
  const [loading, setLoading] = useState(null)  // string | null
  const [modal, setModal] = useState(null)      // modal config
  const toastTimer = useRef(null)
  const modalResolve = useRef(null)

  const showToast = useCallback((title, icon = 'none', duration = 2000) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ title, icon })
    toastTimer.current = setTimeout(() => setToast(null), duration)
  }, [])

  const hideToast = useCallback(() => setToast(null), [])

  const showLoading = useCallback((title = '加载中...') => setLoading(title), [])
  const hideLoading = useCallback(() => setLoading(null), [])

  // 返回 Promise<boolean>，对齐小程序 wx.showModal
  const showModal = useCallback((config) => {
    return new Promise((resolve) => {
      modalResolve.current = resolve
      setModal(config)
    })
  }, [])

  const handleModalConfirm = useCallback(() => {
    setModal(null)
    modalResolve.current?.(true)
  }, [])

  const handleModalCancel = useCallback(() => {
    setModal(null)
    modalResolve.current?.(false)
  }, [])

  return {
    toast, showToast, hideToast,
    loading, showLoading, hideLoading,
    modal, showModal, handleModalConfirm, handleModalCancel,
  }
}
