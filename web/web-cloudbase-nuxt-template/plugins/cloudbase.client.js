import cloudbase from '@cloudbase/js-sdk'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const envId = config.public.envId || 'your-env-id'

  const app = cloudbase.init({
    env: envId,
    timeout: 15000,
  })

  return {
    provide: {
      cloudbase: app,
      cloudbaseEnvId: envId,
    },
  }
})
