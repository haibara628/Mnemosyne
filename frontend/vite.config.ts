import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // BlockSuite 的 DI(`parseIdentifier`)依赖 `Function.prototype.name` 来识别
    // 用构造器注册的服务。oxc 压缩默认会把具名 class 内联成数组里的匿名
    // class 表达式(`[class extends X {...}]`),导致 `.name` 丢失、编辑器中
    // 报 "Input is not a service identifier." 且正文无法渲染。保留 class/function
    // 名即可,只影响 .name,不影响变量名压缩。
    rolldownOptions: {
      output: {
        minify: {
          compress: { keepNames: { class: true, function: true } },
          mangle: { keepNames: true },
        },
      },
    },
  },
  // `vite preview` 不读取 server.proxy,本地验证生产构建时需要同样的代理
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
