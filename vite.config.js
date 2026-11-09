import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { imageUrl } from './src/utils/imageUrl.js'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (command === 'build') {
    imageUrl('/items/1/image', env.VITE_ITEM_IMAGE_BASE_URL, '/unused')
    let apiUrl
    try { apiUrl = new URL(env.VITE_API_BASE_URL?.trim()) } catch {
      throw new Error('公開ビルドには VITE_API_BASE_URL の絶対URLが必要です。開発用 /api プロキシは本番では使えません。')
    }
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(apiUrl.hostname)
    if ((apiUrl.protocol !== 'https:' && !(local && apiUrl.protocol === 'http:'))
      || apiUrl.username || apiUrl.password || apiUrl.search || apiUrl.hash) {
      throw new Error('VITE_API_BASE_URL には認証情報やクエリを含まないHTTPS API URLを指定してください。')
    }
  }
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET || 'http://127.0.0.1:8001',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api(?=\/|$)/, ''),
        },
      },
    },
    build: {
      rolldownOptions: {
        input: {
          app: fileURLToPath(new URL('./index.html', import.meta.url)),
          components: fileURLToPath(new URL('./components-preview.html', import.meta.url)),
        },
      },
    },
  }
})
