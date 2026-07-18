export const AQI_THRESHOLDS = [
  {
    max: 50,
    status: 'Good',
    color: 'var(--success)',
    bg: 'var(--success-bg)',
    description: 'Air quality is satisfactory. Suitable for all outdoor and indoor activities.',
  },
  {
    max: 100,
    status: 'Moderate',
    color: 'var(--warning)',
    bg: 'var(--warning-bg)',
    description: 'Acceptable air quality. Unusually sensitive individuals should consider reducing prolonged exertion.',
  },
  {
    max: 150,
    status: 'Poor',
    color: 'var(--orange)',
    bg: 'var(--orange-bg)',
    description: 'Sensitive groups (students with respiratory conditions, faculty) may experience discomfort. Ventilation is recommended.',
  },
  {
    max: Infinity,
    status: 'Hazardous',
    color: 'var(--danger)',
    bg: 'var(--danger-bg)',
    description: 'Health warning. Classrooms and outdoor areas in the affected zone should be evacuated or sealed off.',
  },
];

export function classifyAirQuality(value) {
  return AQI_THRESHOLDS.find((t) => value <= t.max) ?? AQI_THRESHOLDS[AQI_THRESHOLDS.length - 1];
}

export function statusColorMap(status) {
  const match = AQI_THRESHOLDS.find((t) => t.status === status);
  return match ? { color: match.color, bg: match.bg } : { color: 'var(--text-secondary)', bg: 'var(--background-secondary)' };
}