export function celsiusToFahrenheit(celsius) {
  return celsius * 9 / 5 + 32;
}

export function fahrenheitToCelsius(fahrenheit) {
  return (fahrenheit - 32) * 5 / 9;
}

export function calculateHeatIndex(temperatureC, humidity) {
  const T = celsiusToFahrenheit(temperatureC);
  const R = humidity;

  const heatIndexF =
    -42.379 +
    2.04901523 * T +
    10.14333127 * R -
    0.22475541 * T * R -
    0.00683783 * T * T -
    0.05481717 * R * R +
    0.00122874 * T * T * R +
    0.00085282 * T * R * R -
    0.00000199 * T * T * R * R;

  return fahrenheitToCelsius(heatIndexF);
}
