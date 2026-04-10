export const useCloudbase = () => {
  const { $cloudbase, $cloudbaseEnvId } = useNuxtApp()

  const isValidEnvId = $cloudbaseEnvId && $cloudbaseEnvId !== 'your-env-id'

  const checkEnvironment = () => {
    if (!isValidEnvId) {
      console.error('❌ 云开发环境ID未配置\n\n请在 nuxt.config.ts 的 runtimeConfig.public.envId 中设置环境ID')
      return false
    }
    return true
  }

  const ensureLogin = async () => {
    if (!checkEnvironment()) throw new Error('环境ID未配置')
    const auth = $cloudbase.auth()
    try {
      let loginState = await auth.getLoginState()
      if (loginState) return loginState
      await auth.signInAnonymously()
      return await auth.getLoginState()
    } catch (error) {
      console.error('登录失败:', error)
      return { isLoggedIn: true, user: { uid: 'offline_' + Date.now(), isAnonymous: true, isOffline: true } }
    }
  }

  const logout = async () => {
    const auth = $cloudbase.auth()
    try {
      const loginScope = await auth.loginScope()
      if (loginScope === 'anonymous') return { success: false, message: '匿名登录状态无法退出' }
      await auth.signOut()
      return { success: true, message: '已成功退出登录' }
    } catch (error) {
      console.error('退出登录失败:', error)
      throw error
    }
  }

  return {
    app: $cloudbase,
    envId: $cloudbaseEnvId,
    isValidEnvId,
    checkEnvironment,
    ensureLogin,
    logout,
  }
}
