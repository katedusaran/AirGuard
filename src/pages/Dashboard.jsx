import { useSensorReadings } from '../hooks/useSensorReadings';
import { useAlerts } from '../hooks/useAlerts';
import MultiLineChart from '../components/MultiLineChart.jsx';
import AlertsPanel from '../components/AlertsPanel.jsx';
import ReadingsTable from '../components/ReadingsTable.jsx';
import StatCard from '../components/StatCard.jsx';
import { classifyAirQuality } from '../lib/AirQuality';
import { calculateHeatIndex } from '../lib/HeatIndex';
import '../styles/Dashboard.css';

export default function Dashboard() {
  const { readings, latest, loading } = useSensorReadings('24h');
  const { alerts, loading: alertsLoading } = useAlerts(10);

  const labels = readings.map((r) =>
    new Date(r.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );

  const heatIndexValues = readings.map((r) => Number(calculateHeatIndex(r.temperature, r.humidity).toFixed(1)));

  const series = [
    { label: 'Air Quality', values: readings.map((r) => r.air_quality_value), color: '#3b82f6', unit: ' AQI' },
    { label: 'Temperature', values: readings.map((r) => r.temperature), color: '#ea580c', unit: '°C' },
    { label: 'Humidity', values: readings.map((r) => r.humidity), color: '#14b8a6', unit: '%' },
    { label: 'Heat Index', values: heatIndexValues, color: '#f97316', unit: '°C' },
  ];

  const classification = latest ? classifyAirQuality(latest.air_quality_value) : null;
  // compute counts by classifying actual reading values to avoid casing/status mismatches
  const criticalCount = readings.filter((r) => classifyAirQuality(r.air_quality_value).status === 'Hazardous').length;
  const atRiskCount = readings.filter((r) => classifyAirQuality(r.air_quality_value).status === 'Poor').length;
  const latestHeatIndex = latest ? Number(calculateHeatIndex(latest.temperature, latest.humidity).toFixed(1)) : null;

  // map alerts to nearest reading index so chart can render markers
  const alertIndices = [];
  if (alerts && readings && readings.length > 0) {
    const readingTimes = readings.map((r) => new Date(r.created_at).getTime());
    alerts.forEach((a) => {
      const at = new Date(a.created_at).getTime();
      let bestIdx = -1;
      let bestDiff = Infinity;
      readingTimes.forEach((rt, idx) => {
        const d = Math.abs(rt - at);
        if (d < bestDiff) {
          bestDiff = d;
          bestIdx = idx;
        }
      });
      if (bestIdx >= 0) alertIndices.push(bestIdx);
    });
  }

  return (
    <div className="dashboard-page">
      <div className="stat-grid">
        <StatCard label="Total Readings" value={readings.length} tone="neutral" />
        <StatCard label="At Risk (Poor)" value={atRiskCount} tone="warning" />
        <StatCard label="Critical (Hazardous)" value={criticalCount} tone="danger" />
        <StatCard label="Heat Index" value={latestHeatIndex !== null ? `${latestHeatIndex}°C` : '—'} tone="accent" />
      </div>

      <div className="dashboard-grid">
        <div className="card dashboard-chart-card">
          <div className="card-header">
            <h2>Sensor Trend</h2>
            {classification && (
              <span
                className="dashboard-chart-status"
                style={{ color: classification.color, backgroundColor: classification.bg }}
              >
                {classification.status}
              </span>
            )}
          </div>
          <div className="card-body">
            {loading ? (
              <div className="dashboard-loading">Loading sensor data…</div>
            ) : (
              <MultiLineChart labels={labels} series={series} height={320} alerts={alerts} alertIndices={alertIndices} />
            )}
          </div>
        </div>

        <AlertsPanel alerts={alerts} loading={alertsLoading} />
      </div>

      <ReadingsTable readings={readings} />
    </div>
  );
}