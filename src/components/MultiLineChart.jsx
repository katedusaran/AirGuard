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

// Plugin to draw vertical alert markers on the chart using provided indices
const alertMarkerPlugin = {
  id: 'alertMarkers',
  beforeDatasetsDraw(chart, args, options) {
    const indices = options?.indices || [];
    if (!indices || indices.length === 0) return;
    const ctx = chart.ctx;
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data) return;
    const top = chart.chartArea.top;
    const bottom = chart.chartArea.bottom;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    indices.forEach((i) => {
      const el = meta.data[i];
      if (!el) return;
      const x = el.x;
      ctx.strokeStyle = options.color || 'rgba(220,38,38,0.9)';
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      // small circle marker at top
      ctx.fillStyle = options.color || 'rgba(220,38,38,0.9)';
      ctx.beginPath();
      ctx.arc(x, top + 6, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  },
};

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler, alertMarkerPlugin);

export default function MultiLineChart({ labels, series, height = 340 }) {
  // accept alerts / indices via options prop; chart plugin will draw using options.plugins.alertMarkers.indices
  // but we also accept direct props for convenience
  // NOTE: we expect parent to pass `alertIndices` prop if available
  // keep backwards compatibility
  const alertIndices = (arguments[0] && arguments[0].alertIndices) || [];
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
      // custom alert marker plugin options
      alertMarkers: {
        indices: alertIndices,
        color: 'rgba(220,38,38,0.9)'
      }
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