import {budgetMessages} from '../../lib/pooling/budget'

export default function PoolingBudgetNotice({result}) {
 const messages=budgetMessages(result)
 if(!messages.length)return null
 return <aside aria-label="Time budget review">
  {messages.map((message,index)=><p key={index}>{message}</p>)}
  <p>Coach choices: review a shorter admitted dose or a compatible alternative, review optional blocks, or confirm a different available time. Save and validate a new draft after any change. Do not trim required rest or bypass a restriction.</p>
 </aside>
}
