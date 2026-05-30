import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Vercel 배포 시 base: '/', GitHub Pages 배포 시 base: '/Qedu/'
export default defineConfig({
  plugins: [react()],
  base: process.env.VERCEL ? '/' : '/Qedu/',
})
