// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-04-08',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
  ],

  nitro: {
    preset: 'static', // SSG 静态生成
  },

  runtimeConfig: {
    public: {
      envId: process.env.NUXT_PUBLIC_ENV_ID || 'your-env-id',
    },
  },

  app: {
    baseURL: '/',
    head: {
      title: 'CloudBase Nuxt 模板',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },
})
