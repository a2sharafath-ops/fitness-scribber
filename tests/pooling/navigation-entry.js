import {createElement} from 'react'
import {createRoot} from 'react-dom/client'
import {BrowserRouter} from 'react-router-dom'
import {NavigationFixture,ViewportFixture} from './navigation.jsx'
const permitted = import.meta.env.DEV && location.hostname === '127.0.0.1' && !import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_ANON_KEY
createRoot(document.getElementById('root')).render(permitted ? location.pathname.startsWith('/tests/') ? createElement(ViewportFixture) : createElement(BrowserRouter,null,createElement(NavigationFixture)) : createElement('p',null,'Fixture unavailable outside isolated local development.'))
