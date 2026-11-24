// The two Chart.js charts from the design: accuracy by user (vertical bars)
// and most-followed teams (horizontal bars). Colors come from the team's CSS
// tokens (--accent, --border-strong, ...) so they follow the app theme.
import { useState } from 'react';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const FALLBACK = {
  accent: '#FF4F00',
  bar: '#9C8462',
  grid: '#CBB493',
  muted: '#5E4C38',
  text: '#161415',
};

// Reads the theme tokens (defined on :root) once, on the first render.
function readThemeColors() {
  const s = getComputedStyle(document.documentElement);
  const get = (name, fb) => s.getPropertyValue(name).trim() || fb;
  return {
    accent: get('--accent', FALLBACK.accent),
    bar: get('--border-strong', FALLBACK.bar),
    grid: get('--border', FALLBACK.grid),
    muted: get('--muted', FALLBACK.muted),
    text: get('--text', FALLBACK.text),
  };
}

function useThemeColors() {
  const [c] = useState(readThemeColors);
  return c;
}

const FONT = { family: "'Jost', system-ui, -apple-system, sans-serif" };

function baseOptions(c) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    font: FONT,
    scales: {
      x: { grid: { display: false }, border: { color: c.bar }, ticks: { color: c.muted, font: { ...FONT, size: 11, weight: 500 } } },
      y: { grid: { color: c.grid }, border: { display: false }, ticks: { color: c.muted, font: { ...FONT, size: 12, weight: 500 } } },
    },
  };
}

// Vertical bars: % of completed-game picks correct (UserPredictionAccuracy).
// The logged-in user's bar is drawn in the accent color, like the design.
export function AccuracyChart({ data, meId }) {
  const c = useThemeColors();
  const base = baseOptions(c);
  return (
    <Bar
      aria-label={`Prediction accuracy: ${data.map((d) => `${d.username} ${d.accuracy}%`).join(', ')}`}
      role="img"
      data={{
        labels: data.map((d) => d.username),
        datasets: [
          {
            label: 'Accuracy',
            data: data.map((d) => d.accuracy),
            backgroundColor: data.map((d) => (d.user_id === meId ? c.accent : c.bar)),
            borderRadius: { topLeft: 4, topRight: 4 },
            maxBarThickness: 36,
          },
        ],
      }}
      options={{
        ...base,
        scales: {
          x: { ...base.scales.x, ticks: { ...base.scales.x.ticks, autoSkip: false, maxRotation: 40 } },
          y: { ...base.scales.y, min: 0, max: 100, ticks: { ...base.scales.y.ticks, stepSize: 25, callback: (v) => `${v}%` } },
        },
        plugins: {
          ...base.plugins,
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const d = data[ctx.dataIndex];
                return `${d.accuracy}% (${d.correct} of ${d.total} correct)`;
              },
            },
          },
        },
      }}
    />
  );
}

// Horizontal bars: followers per team (MostFollowedTeams). Top team in accent.
export function FollowedTeamsChart({ data }) {
  const c = useThemeColors();
  const base = baseOptions(c);
  return (
    <Bar
      aria-label={`Most-followed teams: ${data.map((d) => `${d.team_name} ${d.followers}`).join(', ')}`}
      role="img"
      data={{
        labels: data.map((d) => d.team_name),
        datasets: [
          {
            label: 'Followers',
            data: data.map((d) => d.followers),
            backgroundColor: data.map((_, i) => (i === 0 ? c.accent : c.bar)),
            borderRadius: 4,
            maxBarThickness: 20,
          },
        ],
      }}
      options={{
        ...base,
        indexAxis: 'y',
        scales: {
          x: { ...base.scales.x, beginAtZero: true, grid: { color: c.grid }, border: { display: false }, ticks: { ...base.scales.x.ticks, precision: 0 } },
          y: { ...base.scales.y, grid: { display: false }, ticks: { color: c.text, font: { ...FONT, size: 13, weight: 600 } } },
        },
      }}
    />
  );
}
