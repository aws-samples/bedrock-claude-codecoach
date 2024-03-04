const path = require('path')
/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
    //output: 'export',
    reactStrictMode: true,
    // output: 'standalone',
    // Optional: Change links `/me` -> `/me/` and emit `/me.html` -> `/me/index.html`
    // trailingSlash: true,
   
    // Optional: Prevent automatic `/me` -> `/me/`, instead preserve `href`
    // skipTrailingSlashRedirect: true,
   
    // Optional: Change the output directory `out` -> `dist`
    // distDir: 'dist',
    i18n: {
      locales: ['en', 'zh'],
      defaultLocale: 'en'
    },
    
  }
   
  module.exports = nextConfig