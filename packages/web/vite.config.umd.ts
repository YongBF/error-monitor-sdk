import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'ErrorMonitorWeb',
      formats: ['umd'],
      fileName: 'index.umd.js'
    },
    rollupOptions: {
      // UMD 构建不 externalize 任何依赖，全部打包
      output: {
        globals: {}
      }
    },
    sourcemap: true,
    minify: 'esbuild'
  },
  plugins: [dts({ rollupTypes: true })]
})
