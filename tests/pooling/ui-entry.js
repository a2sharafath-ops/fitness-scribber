import {createElement} from 'react'
import {createRoot} from 'react-dom/client'
import {Preview,Fixture} from './ui.jsx'
const frame=new URLSearchParams(location.search).has('frame')
const permitted=import.meta.env.DEV && location.hostname==='127.0.0.1' && !import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_ANON_KEY
createRoot(document.getElementById('root')).render(permitted?createElement(frame?Fixture:Preview):createElement('p',null,'Fixture unavailable outside isolated local development.'))
