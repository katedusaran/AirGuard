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

export default function MultiLineChart({ labels, series, height = 340 }) {
  // series: [{ label, values, color, unit }]
  const hasData = series.some((s) => s.values.length > 0);

  const data = {
    labels,
    datasets: series.map((s) => ({
      label: s.label,
      data: s.values,
      borderColor: s.color,
      backgroundColor: `${s.color}22`,
      borderWidth: 1.75,
      pointRadius: 3,
      pointHoverRadius: 4,
      pointBackgroundColor: s.color,
      pointBorderColor: s.color,
      pointBorderWidth: 1,
      pointStyle: 'circle',
      fill: true,
      tension: 0.25,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 7,
          boxHeight: 7,
          font: { size: 11.5, family: 'Inter' },
          color: '#64748b',
          padding: 16,
        },
      },
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
          label: (ctx) => {
            const s = series[ctx.datasetIndex];
            return `${s.label}: ${ctx.parsed.y}${s.unit ?? ''}`;
          },
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
      {!hasData ? (
        <div className="line-chart-empty">No readings available for this period.</div>
      ) : (
        <div style={{ height }}>
          <Line data={data} options={options} />
        </div>
      )}
    </div>
  );
}