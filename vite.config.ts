import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  // 실제 서비스 주소: https://2rangs.github.io/portfolio/pokestra/ (2rangs.github.io 저장소가 빌드)
  base: '/portfolio/pokestra/',
})