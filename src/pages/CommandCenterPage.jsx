import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Avatar from '../components/atoms/Avatar'
import Button from '../components/atoms/Button'
import SegToggle from '../components/molecules/SegToggle'
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
  const [win, setWin] = useState(7)
  const [range, setRange] = useState(28)
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
          <span className="muted" style={{ fontSize: 11, fontWeight: 700 }}>ROLLING</span>
          <SegToggle options={[[1, 'Raw'], [7, '7-day'], [28, '28-day']]} value={win} onChange={setWin} ariaLabel="Rolling window" />
          <SegToggle options={[[28, '4 wk'], [56, '8 wk'], [90, '12 wk']]} value={range} onChange={setRange} ariaLabel="Date range" />
          <Button variant="ghost" size="sm" onClick={() => openModal(<QuickLogMenu clientId={c.id} />)}>＋ Quick log</Button>
          <Button variant="ghost" size="sm" onClick={() => nav('/monitor/' + c.id)}>Detailed logs</Button>
          <Button variant="ghost" size="sm" onClick={() => nav('/report/' + c.id)}>📄 Report</Button>
        </div>
      </div>

      <div className="cc-wrap">
        <div className="cc-main">
          <LoadResponseDashboard client={c} win={win} range={range} />
          <StrengthDashboard client={c} range={range >= 56 ? range : 90} />
          <WorkoutPlanner client={c} />
        </div>
        <div className="cc-side"><AICoach client={c} /></div>
      </div>

      <ProfilePanel client={c} open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
}
