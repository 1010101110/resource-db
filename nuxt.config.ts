// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@bootstrap-vue-next/nuxt', '@nuxtjs/color-mode'],
  css: ['bootstrap/dist/css/bootstrap.min.css','leaflet/dist/leaflet.css'],
  colorMode: {
    preference: 'system',
    fallback: 'light',
    globalName: '__NUXT_COLOR_MODE__',
    componentName: 'ColorScheme',
    classPrefix: '',
    classSuffix: '',
    dataValue: 'bs-theme',
    storageKey: 'nuxt-color-mode'
  }
})