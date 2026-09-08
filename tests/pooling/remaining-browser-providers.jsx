import {createContext,useContext,useEffect,useState} from 'react'
import {actor} from './remaining-browser-backend'
const Context=createContext(null)
export function FixtureProvider({children}){
 const [db,setDb]=useState(null)
 useEffect(()=>{fetch('/__fixture').then(r=>r.json()).then(setDb)},[])
 if(!db)return <p>Loading local SQL fixture</p>
 return <Context.Provider value={{db,units:'kg',tz:'UTC',commit:()=>{throw Error('Legacy write forbidden in this fixture')}}}>{children}</Context.Provider>
}
// eslint-disable-next-line react-refresh/only-export-components
export function useData(){return useContext(Context)}
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(){return {user:{id:actor}}}
