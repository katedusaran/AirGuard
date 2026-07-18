import { classifyAirQuality } from '../lib/AirQuality';
import '../styles/ReadingsTable.css';

export default function ReadingsTable({ readings }) {
  return (
    <div className="card readings-table-card">
      <div className="card-header">
        <h2>Sensor Monitoring</h2>
      </div>
      <div className="readings-table-wrap">
        <table className="readings-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Air Quality</th>
              <th>Temperature</th>
              <th>Humidity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {readings.length === 0 ? (
              <tr>
                <td colSpan={6} className="readings-table-empty">No readings yet.</td>
              </tr>
            ) : (
              readings.map((r) => {
                const date = new Date(r.created_at);
                const c = classifyAirQuality(r.air_quality_value);
                return (
                  <tr key={r.id}>
                    <td>{date.toLocaleDateString()}</td>
                    <td className="mono">{date.toLocaleTimeString()}</td>
                    <td className="mono">{Math.round(r.air_quality_value)}</td>
                    <td className="mono">{r.temperature}°C</td>
                    <td className="mono">{r.humidity}%</td>
                    <td>
                      <span className="readings-status" style={{ color: c.color, backgroundColor: c.bg }}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}