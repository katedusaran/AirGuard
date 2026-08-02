import '../styles/AlertsPanel.css';

const ALERT_STYLE_MAP = {
  hazardous: { color: 'var(--danger)', border: 'var(--danger)' },
  poor: { color: 'var(--orange)', border: 'var(--orange)' },
  info: { color: 'var(--primary-blue)', border: 'var(--primary-blue)' },
};

function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diffSeconds = Math.round((now - timestamp.getTime()) / 1000);
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function AlertsPanel({ alerts, loading }) {
  return (
    <div className="card alerts-panel">
      <div className="card-header">
        <h2>Recent Alerts</h2>
      </div>
      <div className="alerts-panel-body">
        {loading ? (
          <div className="dashboard-loading">Loading alerts…</div>
        ) : alerts.length === 0 ? (
          <div className="dashboard-loading">No alerts recorded.</div>
        ) : (
          alerts.map((alert) => {
            const date = new Date(alert.created_at);
            const typeKey = alert.alert_type?.toLowerCase() || 'info';
            const styles = ALERT_STYLE_MAP[typeKey] ?? ALERT_STYLE_MAP.info;
            const preview = alert.message.length > 90 ? `${alert.message.slice(0, 87)}...` : alert.message;

            return (
              <details key={alert.id} className="alerts-panel-item" style={{ borderLeftColor: styles.border }}>
                <summary className="alerts-panel-summary" title={alert.message}>
                  <div className="alerts-panel-summary-left">
                    <span className="alerts-panel-badge" style={{ backgroundColor: styles.border }} />
                    <div className="alerts-panel-summary-texts">
                      <span className="alerts-panel-type" style={{ color: styles.color }}>
                        {alert.alert_type}
                      </span>
                      <span className="alerts-panel-preview">{preview}</span>
                    </div>
                  </div>
                  <span className="alerts-panel-time">{formatRelativeTime(date)}</span>
                </summary>
                <div className="alerts-panel-message">{alert.message}</div>
              </details>
            );
          })
        )}
      </div>
    </div>
  );
}
