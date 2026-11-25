// Register the Chart.js pieces we use, once, and expose shared workspace options.
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

// Chart.js copies scale defaults at creation. Resolve their colors on each draw
// so a mounted chart can follow the workspace when the coach switches themes.
ChartJS.defaults.scale.ticks.color = () => ChartJS.defaults.color
ChartJS.defaults.scale.title.color = () => ChartJS.defaults.color
ChartJS.defaults.scale.grid.color = () => ChartJS.defaults.borderColor
ChartJS.defaults.scale.border.color = () => ChartJS.defaults.borderColor

function syncChartAppearance() {
  const styles = window.getComputedStyle(document.documentElement)
  const ink = styles.getPropertyValue('--muted').trim()
  const line = styles.getPropertyValue('--border').trim()
  const family = styles.getPropertyValue('--orbit-font').trim()
  if (ink) ChartJS.defaults.color = ink
  if (line) ChartJS.defaults.borderColor = line
  if (family) ChartJS.defaults.font.family = family
  for (const chart of Object.values(ChartJS.instances)) chart.update('none')
}

if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
  syncChartAppearance()
  const observer = new window.MutationObserver(syncChartAppearance)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-orbit-theme'] })
  document.fonts?.ready.then(syncChartAppearance)
  if (import.meta.hot) import.meta.hot.dispose(() => observer.disconnect())
}

// Shared dataset palette so charts across pages stay consistent.
export const COLORS = {
  blue: '#6e8397',
  red: '#a47278',
  green: '#718b79',
  purple: '#89749c',
  amber: '#a17e60',
  muted: '#85818a',
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
    plugins: { legend: { labels: { boxWidth: 12, font: { size: 11 } } } },
    scales: {
      x: { grid: {}, ticks: { maxTicksLimit: 8, font: { size: 11 } } },
      y: { grid: {}, ticks: { font: { size: 11 } } },
    },
  }
}
