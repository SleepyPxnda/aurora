import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['shadcn-nuxt', 'nuxt-auth-utils'],
  css: ['~/assets/css/main.css'],
  typescript: { strict: true },

  runtimeConfig: {
    // env NUXT_DATA_DIR
    dataDir: '.data',
    // env NUXT_OAUTH_OIDC_CLIENT_ID, _CLIENT_SECRET, _OPENID_CONFIG, _REDIRECT_URL
    oauth: { oidc: { clientId: '', clientSecret: '', openidConfig: '', redirectURL: '' } },
    // env NUXT_SESSION_PASSWORD (at least 32 characters)
    session: { password: '', maxAge: 60 * 60 * 12 },
  },

  vite: {
    plugins: [tailwindcss()],
  },

  shadcn: {
    prefix: '',
    componentDir: '@/components/ui',
  },
})
