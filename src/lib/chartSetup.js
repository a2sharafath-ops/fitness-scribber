// Register the Chart.js pieces we use, once, and expose shared dark-theme options.
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  BarController, LineController, ScatterController,
  Title, Tooltip, Legend, Filler, ArcElement,
} from 'chart.js'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  BarController, LineController, ScatterController,
  Title, Tooltip, Legend, Filler, ArcElement,
)

const GRID = '#2a3039'
const TEXT = '#8b95a5'

// Shared dataset palette so charts across pages stay consistent.
export const COLORS = {
  blue: '#4aa8ff',
  red: '#ff5a3c',
  green: '#3ddc97',
  purple: '#a78bfa',
  amber: '#f5b14c',
  muted: '#8b95a5',
}

// Short axis label from an ISO date ("Jun 30").
export const shortLabel = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function baseOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: TEXT, boxWidth: 12, font: { size: 11 } } } },
    scales: {
      x: { grid: { color: GRID }, ticks: { color: TEXT, maxTicksLimit: 8, font: { size: 9 } } },
      y: { grid: { color: GRID }, ticks: { color: TEXT } },
    },
  }
}

export { GRID, TEXT }
