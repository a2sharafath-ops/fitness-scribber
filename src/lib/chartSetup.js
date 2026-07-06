// Register the Chart.js pieces we use, once, and expose shared light-theme options.
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  BarController, LineController, ScatterController, DoughnutController,
  Title, Tooltip, Legend, Filler, ArcElement,
} from 'chart.js'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  BarController, LineController, ScatterController, DoughnutController,
  Title, Tooltip, Legend, Filler, ArcElement,
)

const GRID = '#eceae7'
const TEXT = '#6e6f76'

// Shared dataset palette so charts across pages stay consistent.
export const COLORS = {
  blue: '#0b87c9',
  red: '#fb404a',
  green: '#34c759',
  purple: '#af52de',
  amber: '#e8850c',
  muted: '#9a9ba2',
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
