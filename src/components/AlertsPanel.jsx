import '../styles/AlertsPanel.css';

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
          alerts.map((alert) => (
            <div key={alert.id} className="alerts-panel-item">
              <div className="alerts-panel-item-top">
                <span className="alerts-panel-type">{alert.alert_type}</span>
                <span className="alerts-panel-time">
                  {new Date(alert.created_at).toLocaleString()}
                </span>
              </div>
              <p className="alerts-panel-message">{alert.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}