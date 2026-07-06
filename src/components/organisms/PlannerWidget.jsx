import { useState } from 'react'
import SegToggle from '../molecules/SegToggle'
import TodayWorkout from './workout/TodayWorkout'
import WorkoutPlanner from './WorkoutPlanner'

// One planner widget, three views. Day (default) is the existing Today's
// Workout controller with a Day/Week/Month switch added to its header; Week
// and Month expand into the calendar planner. All underlying behaviour
// (pick/start/edit/complete a workout, prescribe by day) is unchanged.
export default function PlannerWidget({ client, size = 'medium', todayProps }) {
  const [view, setView] = useState('day')

  if (view !== 'day') {
    return <WorkoutPlanner client={client} size={size} initialView={view} onDay={() => setView('day')} />
  }

  return (
    <TodayWorkout
      {...todayProps}
      headerExtra={
        <SegToggle
          options={[['day', 'Day'], ['week', 'Week'], ['month', 'Month']]}
          value="day"
          onChange={(v) => v !== 'day' && setView(v)}
          ariaLabel="Planner view"
        />
      }
    />
  )
}
