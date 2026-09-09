// Read-only loopback fixture; does not import project credentials or contact a backend.
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
const server = await createServer({
  configFile:false, envDir:false, cacheDir:'node_modules/.vite-pooling-navigation',
  define:{'import.meta.env.VITE_SUPABASE_URL':'""','import.meta.env.VITE_SUPABASE_ANON_KEY':'""'},
  plugins:[react(),{name:'navigation-fixture',configureServer(vite){
    vite.middlewares.use((req,res,next)=>{
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://127.0.0.1:5191; img-src 'self' data:; frame-src 'self'")
      if(req.headers.accept?.includes('text/html'))req.url='/tests/pooling/navigation.html'
      next()
    })
  }}],
  server:{host:'127.0.0.1',port:5191,strictPort:true,fs:{deny:['.env','.env.*','*.{crt,pem,key,p12,pfx,cer,der}','.npmrc','.yarnrc.yml','**/.git/**','**/.recovery/**','**/.local-test-runtime/**']},watch:{ignored:['**/.recovery/**','**/.local-test-runtime/**']}},
  logLevel:'error',
})
await server.listen()
console.log('Isolated navigation fixture: http://127.0.0.1:5191/tests/pooling/navigation.html')
async function close(){await server.close();process.exit(0)}
process.on('SIGTERM',close);process.on('SIGINT',close)
