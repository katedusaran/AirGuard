import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import '../styles/LineChart.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function LineChart({ title, labels, values, color = '#3b82f6', unit = '', height = 240 }) {
  const data = {
    labels,
    datasets: [
      {
        label: title,
        data: values,
        borderColor: color,
        backgroundColor: color,
        fill: true,
        borderWidth: 1.75,
        pointRadius: 3,
        pointHoverRadius: 4,
        pointBackgroundColor: color,
        pointBorderColor: color,
        pointBorderWidth: 1,
        pointStyle: 'circle',
        tension: 0.25,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#ffffff',
        titleColor: '#1e293b',
        bodyColor: '#1e293b',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 10,
        titleFont: { size: 11, family: 'Inter' },
        bodyFont: { size: 11.5, family: 'Inter' },
        callbacks: {
          label: (ctx) => `${ctx.parsed.y}${unit}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 10.5, family: 'Inter' }, maxTicksLimit: 8 },
        border: { color: '#e2e8f0' },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { color: '#94a3b8', font: { size: 10.5, family: 'Inter' } },
        border: { display: false },
      },
    },
  };

  return (
    <div className="line-chart">
      {title && <div className="line-chart-title">{title}</div>}
      {values.length === 0 ? (
        <div className="line-chart-empty">No readings available for this period.</div>
      ) : (
        <div style={{ height }}>
          <Line data={data} options={options} />
        </div>
      )}
    </div>
  );
}