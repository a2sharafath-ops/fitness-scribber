import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Local recovery databases and binary mounts are never application sources.
  server: {
    watch: { ignored: ['**/.local-test-runtime/**', '**/.recovery/**'] },
    // Preserve Vite's default secret denials and also protect backup/test data.
    fs: { deny: ['.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '.npmrc', '.yarnrc.yml', '**/.git/**', '**/.local-test-runtime/**', '**/.recovery/**'] },
  },
})
