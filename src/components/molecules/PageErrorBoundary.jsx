import {Component} from 'react'

export default class PageErrorBoundary extends Component{
 state={error:null}
 static getDerivedStateFromError(error){return {error}}
 componentDidCatch(error,details){if(import.meta.env.DEV)console.error('Page failed to render',error,details)}
 render(){
  if(!this.state.error)return this.props.children
  return <div className="coach-page"><section className="coach-card coach-error" role="alert"><h1>This page could not open</h1><p>Your saved client information and workouts have not been changed.</p><button className="btn" onClick={()=>window.location.reload()}>Try again</button><details className="coach-support"><summary>Technical details</summary><p>{this.state.error.message||'Unknown page error'}</p></details></section></div>
 }
}
