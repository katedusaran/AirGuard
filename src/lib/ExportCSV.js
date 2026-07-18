export function exportSensorReadingsCSV(rows, filename = 'airguard-sensor-readings.csv') {
  const headers = ['Date', 'Time', 'Air Quality', 'Temperature (C)', 'Humidity (%)', 'Status'];
  const lines = [headers.join(',')];

  rows.forEach((row) => {
    const date = new Date(row.created_at);
    lines.push(
      [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        row.air_quality_value,
        row.temperature,
        row.humidity,
        row.air_quality_status,
      ].join(',')
    );
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}