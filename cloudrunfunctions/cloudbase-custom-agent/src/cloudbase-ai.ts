import _cloudbase = require('@cloudbase/js-sdk')
import _adapter = require('@cloudbase/adapter-node')

type AI = import("@cloudbase/js-sdk/ai").AI

export async function getCloudbaseAi(envId: string): Promise<AI> {
  const cloudbase =
    _cloudbase as unknown as typeof import('@cloudbase/js-sdk').default
  const adapter =
    _adapter as unknown as typeof import('@cloudbase/adapter-node').default

  let ai: AI | null = null
  if (!ai) {
    const { sessionStorage } = adapter.genAdapter()
    cloudbase.useAdapters(adapter)

    const app = cloudbase.init({
      env: envId,
    })

    /**
     * auth 初始化的时候要传入storage 和 captchaOptions.openURIWithCallback
     * 否则会用默认的，依赖于平台，在 nodejs 环境报错
     */
    const auth = app.auth({
      storage: sessionStorage,
      captchaOptions: {
        openURIWithCallback: (...props: any) =>
          console.log('open uri with callback', ...props),
      },
    } as any)

    await auth.signInAnonymously()

    ai = await (app as any).ai()
  }

  return ai as AI
}
