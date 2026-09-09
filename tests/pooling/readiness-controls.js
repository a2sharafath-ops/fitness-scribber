if(import.meta.env.DEV&&location.origin==='http://127.0.0.1:5192'){
  const refresh=async()=>{const response=await fetch('/__readiness/status');document.getElementById('status').textContent=JSON.stringify(await response.json(),null,2)}
  document.getElementById('refresh').addEventListener('click',refresh)
  refresh()
}
