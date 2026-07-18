import '../styles/StatCard.css';

export default function StatCard({ label, value, tone = 'neutral' }) {
  return (
    <div className={`stat-card stat-card-${tone}`}>
      <span className="stat-card-label">{label}</span>
      <span className="stat-card-value">{value}</span>
    </div>
  );
}