import { useAlerts } from '../hooks/useAlerts';
import AlertsPanel from '../components/AlertsPanel.jsx';
import '../styles/AlertsPage.css';

export default function Alerts() {
  const { alerts, loading } = useAlerts(50);
  const sentCount = alerts.filter((a) => a.status === 'sent').length;

  return (
    <div className="alerts-page">
      <div className="alerts-summary">
        <div className="alerts-summary-item">
          <span className="alerts-summary-label">Total Alerts</span>
          <span className="alerts-summary-value">{alerts.length}</span>
        </div>
        <div className="alerts-summary-item">
          <span className="alerts-summary-label">SMS Delivered</span>
          <span className="alerts-summary-value" style={{ color: 'var(--success)' }}>{sentCount}</span>
        </div>
        <div className="alerts-summary-item">
          <span className="alerts-summary-label">Pending / Failed</span>
          <span className="alerts-summary-value" style={{ color: 'var(--orange)' }}>{alerts.length - sentCount}</span>
        </div>
      </div>

      <AlertsPanel alerts={alerts} loading={loading} />
    </div>
  );
}