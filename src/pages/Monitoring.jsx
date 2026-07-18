import { useState } from 'react';
import { Download } from 'lucide-react';
import { useSensorReadingsByDate } from '../hooks/useSensorReadingsByDate';
import ReadingsTable from '../components/ReadingsTable.jsx';
import { exportSensorReadingsCSV } from '../lib/ExportCSV';
import '../styles/Monitoring.css';

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoString(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function Monitoring() {
  const [startDate, setStartDate] = useState(daysAgoString(7));
  const [endDate, setEndDate] = useState(todayString());

  const { readings, loading } = useSensorReadingsByDate(startDate, endDate);

  return (
    <div className="monitoring-page">
      <div className="monitoring-toolbar">
        <span className="page-title" style={{ margin: 0 }}>Real-Time Monitoring</span>

        <div className="monitoring-filters">
          <div className="monitoring-date-field">
            <label htmlFor="start-date">From</label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="monitoring-date-field">
            <label htmlFor="end-date">To</label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              min={startDate}
              max={todayString()}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button
            className="monitoring-export-btn"
            onClick={() => exportSensorReadingsCSV(readings)}
            disabled={readings.length === 0}
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-loading">Loading sensor data…</div>
      ) : (
        <ReadingsTable readings={readings} />
      )}
    </div>
  );
}