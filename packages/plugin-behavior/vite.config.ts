import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'BehaviorPlugin',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`
    },
    rollupOptions: {
      external: ['error-monitor-core'],
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
