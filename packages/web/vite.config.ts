import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'ErrorMonitorWeb',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => {
        if (format === 'umd') return 'index.umd.js'
        return `index.${format === 'es' ? 'mjs' : 'cjs'}`
      }
    },
    rollupOptions: {
      output: {
        globals: {
          'error-monitor-core': 'ErrorMonitorCore'
        }
      }
    },
    sourcemap: true,
    minify: 'esbuild'
  },
  plugins: [dts({ compilerOptions: { removeComments: true } })]
})
