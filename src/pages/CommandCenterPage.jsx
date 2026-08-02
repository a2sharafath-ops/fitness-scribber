import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Avatar from '../components/atoms/Avatar'
import Button from '../components/atoms/Button'
import ReadinessTag from '../components/molecules/ReadinessTag'
import LoadResponseDashboard from '../components/organisms/LoadResponseDashboard'
import StrengthDashboard from '../components/organisms/StrengthDashboard'
import WorkoutPlanner from '../components/organisms/WorkoutPlanner'
import AICoach from '../components/organisms/AICoach'
import ProfilePanel from '../components/organisms/ProfilePanel'
import ClientSubnav from '../components/templates/ClientSubnav'
import { QuickLogMenu } from '../components/organisms/forms/LogForms'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { readinessFor } from '../lib/calc'

export default function CommandCenterPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { db } = useData()
  const { openModal } = useModal()
  const [profileOpen, setProfileOpen] = useState(false)
  const c = db.clients.find((x) => x.id === id)
  if (!c) return <Button className="back" variant="ghost" onClick={() => nav('/clients')}>← Clients</Button>

  return (
    <>
      <ClientSubnav client={c} />
      <div className="cc-topbar">
        <div className="flex gap">
          <div className="mini-profile" role="button" tabIndex={0} title="View full profile"
            onClick={() => setProfileOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setProfileOpen(true) } }}>
            <Avatar name={c.name} size={40} />
            <div><div className="mp-name">{c.name}</div><div className="mp-goal">🎯 {c.goal}</div></div>
            <span className="mp-caret">▸ profile</span>
          </div>
          <ReadinessTag readiness={readinessFor(db, c.id)} />
        </div>
        <div className="cc-controls">
          <Button variant="ghost" size="sm" onClick={() => openModal(<QuickLogMenu clientId={c.id} />)}>＋ Quick log</Button>
          <Button variant="ghost" size="sm" onClick={() => nav('/monitor/' + c.id)}>Detailed logs</Button>
          <Button variant="ghost" size="sm" onClick={() => nav('/report/' + c.id)}>📄 Report</Button>
        </div>
      </div>

      <div className="cc-wrap">
        <div className="cc-main">
          <LoadResponseDashboard client={c} />
          <StrengthDashboard client={c} />
          <WorkoutPlanner client={c} />
        </div>
        <div className="cc-side"><AICoach client={c} /></div>
      </div>

      <ProfilePanel client={c} open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
}
