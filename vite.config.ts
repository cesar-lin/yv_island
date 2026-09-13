import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  // 传入 --mode singlefile 时打成单个 html，双击即可离线打开
  plugins: [inspectAttr(), react(), ...(process.env.SINGLEFILE ? [viteSingleFile()] : [])],
  server: {
    port: 3000,
  },
});
