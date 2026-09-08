// Local-only, disposable browser profiles. Never reads the user's browser data.
import {createServer} from 'vite'
import {resolve} from 'node:path'
import {mkdirSync,writeFileSync,existsSync} from 'node:fs'
import assert from 'node:assert/strict'
const packagePath=process.env.FITNESS_PLAYWRIGHT_MODULE
assert(packagePath?.endsWith('/playwright/index.mjs'),'Set the existing bundled Playwright module path')
const {chromium,webkit}=await import(packagePath)
const server=await createServer({configFile:false,envDir:false,server:{host:'127.0.0.1',port:5187,strictPort:true,fs:{deny:['.env','.env.*','**/.recovery/**','**/.local-test-runtime/**','**/.git/**']},watch:{ignored:['**/.recovery/**','**/.local-test-runtime/**']}},logLevel:'error'})
const results=[]
try{
 await server.listen()
 for(const [name,type]of Object.entries({chromium,webkit})){
  const localWebKit=resolve('.local-test-runtime/verification-browsers/webkit-2336/pw_run.sh')
  const browser=await type.launch({headless:true,...(name==='webkit'&&existsSync(localWebKit)?{executablePath:localWebKit}:{})})
  try{
   const context=await browser.newContext(),page=await context.newPage()
   await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort())
   await page.goto('http://127.0.0.1:5187/tests/pooling/browser-recovery.html')
   await page.getByRole('button',{name:'Run browser checks'}).click()
   await page.waitForFunction(()=>document.querySelector('#result').textContent.startsWith('{'))
   const result=JSON.parse(await page.locator('#result').textContent());results.push({browser:name,...result})
   console.log(JSON.stringify(results.at(-1)));assert(result.passed)
   await context.close()
  }finally{await browser.close()}
 }
}finally{
 await server.close()
 mkdirSync(resolve('.recovery/remaining-verification'),{recursive:true,mode:0o700})
 writeFileSync('.recovery/remaining-verification/browser.json',JSON.stringify({at:new Date().toISOString(),results},null,2)+'\n',{mode:0o600,flush:true})
}
