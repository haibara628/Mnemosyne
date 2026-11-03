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
    // BlockSuite 的 DI(`parseIdentifier`)依赖 `Function.prototype.name` 识别用构造器
    // 注册的服务。oxc 压缩会把具名 class 内联成匿名 class 表达式,导致 `.name` 丢失、
    // 编辑器报 "Input is not a service identifier." 且正文无法渲染。
    // 个人工具,关闭压缩换取正确性(体积可接受,Caddy 已配 zstd/gzip 传输压缩)。
    minify: false,
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
