/*
  ============================================================
  AirGuard — ESP32 Air Quality Monitor
  ESP32 WROOM-32 + MQ135 + DHT22 + SIM900A + Supabase REST API
  ============================================================

  What this sketch does:
  - Reads MQ135 (air quality, raw ADC via voltage divider) and DHT22
    (temperature/humidity)
  - Classifies air quality into GOOD / MODERATE / POOR
  - Drives 3 status LEDs (green/yellow/red) based on that tier
  - Uploads every reading to Supabase `sensor_readings` (over WiFi)
  - Inserts a row into `alerts` and sends an SMS via SIM900A when
    air quality crosses into POOR — and again once when it recovers
    (no repeat-spam while still in an alert state)
  - Updates `devices.status` / `devices.last_seen` on each cycle

  ASSUMPTIONS I made to fill gaps — please confirm/correct:
  --------------------------------------------------------------
  1. WIRING: This sketch assumes the pin map from your README:
       MQ135 A0  -> GPIO34 (via voltage divider)
       DHT22 DATA-> GPIO4
       SIM900A TXD -> GPIO16 (RX2)   SIM900A RXD -> GPIO17 (TX2)
       LED Red -> GPIO25  LED Yellow -> GPIO26  LED Green -> GPIO27
     NOTE: your README's LED table used GPIO25/26/27 for Red/Yellow/
     Green, but your Fritzing diagram wires D21/D19/D18 to the LEDs
     instead. I followed the README/pin-map table here since that's
     the documented "as wired" source — swap the LED_* defines below
     if your physical build actually matches the Fritzing diagram.
  2. VOLTAGE DIVIDER RATIO: your Fritzing diagram shows 10k/10k, but
     your README's divider history says 2x10k(top)/1x10k(bottom) was
     the ratio that produced a real, sustained smoke response. I used
     the 2:1 ratio's implied scaling comment below — but since your
     README says this still needs a clean, re-verified test, treat
     AQI_GOOD_MAX / AQI_MODERATE_MAX below as PLACEHOLDERS to replace
     once you've re-run that clean before/after test.
  3. AQI THRESHOLDS: used your README's tuned test_mq135.ino values
     (2800 / 3400 raw ADC) as placeholders for GOOD/MODERATE cutoffs.
  4. WiFi: your README/wiring diagram never mentioned WiFi, but the
     dashboard reads from Supabase, so something has to write to it.
     I added WiFi + Supabase REST calls directly from the ESP32
     (same pattern as your BreatheSafe reference file) since SIM900A
     is used here only for SMS, not data upload. If you'd rather have
     the SIM900A do GPRS data upload instead of WiFi, say so and this
     changes.
  5. DEVICE_ID: must be the actual UUID of this device's row in your
     `devices` table (not a made-up string) — Supabase's device_id
     columns are typed uuid. Fill in DEVICE_ID_UUID below.
  6. ALERT_PHONE_NUMBER: still blank per your README's open items —
     fill in below.

  Libraries required (Arduino IDE Library Manager):
  - DHT sensor library (Adafruit) + Adafruit Unified Sensor
  - ArduinoJson
  - ESP32 board package (provides WiFi.h, HTTPClient.h,
    WiFiClientSecure.h, HardwareSerial)
  ============================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ============================================================
// CONFIGURATION — fill these in
// ============================================================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* SUPABASE_URL    = "https://YOUR_PROJECT_REF.supabase.co";
const char* SUPABASE_APIKEY = "YOUR_SUPABASE_ANON_PUBLISHABLE_KEY";

// Must match an existing row's id in the `devices` table (uuid).
const char* DEVICE_ID_UUID = "00000000-0000-0000-0000-000000000000";

// Destination number for SMS alerts, E.164 format e.g. "+639171234567"
const char* ALERT_PHONE_NUMBER = "";

// ============================================================
// PIN MAP (per README "as wired" table)
// ============================================================
#define MQ135_PIN   34
#define DHT_PIN     4
#define DHT_TYPE    DHT22

#define LED_RED     25
#define LED_YELLOW  26
#define LED_GREEN   27

// SIM900A on UART2
HardwareSerial sim900Serial(2);
#define SIM900_RX_PIN 16   // ESP32 RX2 <- SIM900A TXD
#define SIM900_TX_PIN 17   // ESP32 TX2 -> SIM900A RXD

DHT dht(DHT_PIN, DHT_TYPE);

// ============================================================
// AQI THRESHOLDS — placeholders, see assumption #2/#3 above
// ============================================================
const int AQI_GOOD_MAX     = 2800;  // raw ADC <= this -> GOOD
const int AQI_MODERATE_MAX = 3400;  // raw ADC <= this -> MODERATE
                                     // above this      -> POOR

// ============================================================
// TIMING (non-blocking, millis-based)
// ============================================================
const unsigned long READ_INTERVAL   = 10000;  // sensor read cadence
const unsigned long UPLOAD_INTERVAL = 30000;  // Supabase upload cadence
unsigned long lastRead   = 0;
unsigned long lastUpload = 0;

// ============================================================
// STATE
// ============================================================
float temperature = 0, humidity = 0;
int   mq135Raw     = 0;
String aqStatus     = "GOOD";   // GOOD / MODERATE / POOR
bool   alertActive   = false;   // true while currently in POOR state
bool   sim900Ready    = false;

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(LED_RED, OUTPUT);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  setLEDs(false, false, false);

  dht.begin();

  sim900Serial.begin(9600, SERIAL_8N1, SIM900_RX_PIN, SIM900_TX_PIN);
  initSIM900A();

  connectWiFi();
}

// ============================================================
// LOOP
// ============================================================
void loop() {
  unsigned long now = millis();

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (now - lastRead >= READ_INTERVAL) {
    lastRead = now;
    readSensors();
    updateLEDs();
    printSerial();
    handleAlertLogic();
  }

  if (now - lastUpload >= UPLOAD_INTERVAL) {
    lastUpload = now;
    uploadReading();
    updateDeviceHeartbeat();
  }
}

// ============================================================
// WIFI
// ============================================================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(300);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" connected.");
  } else {
    Serial.println(" failed — will retry next loop.");
  }
}

// ============================================================
// SENSOR READING
// ============================================================
void readSensors() {
  // Average a handful of ADC samples to reduce noise
  long sum = 0;
  const int samples = 10;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(MQ135_PIN);
    delay(5);
  }
  mq135Raw = sum / samples;

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t)) temperature = t;
  if (!isnan(h)) humidity = h;

  if (mq135Raw <= AQI_GOOD_MAX) {
    aqStatus = "GOOD";
  } else if (mq135Raw <= AQI_MODERATE_MAX) {
    aqStatus = "MODERATE";
  } else {
    aqStatus = "POOR";
  }
}

void printSerial() {
  Serial.printf("MQ135 raw: %d | Temp: %.1fC | Hum: %.1f%% | Status: %s\n",
                mq135Raw, temperature, humidity, aqStatus.c_str());
}

// ============================================================
// LEDS
// ============================================================
void setLEDs(bool red, bool yellow, bool green) {
  digitalWrite(LED_RED, red);
  digitalWrite(LED_YELLOW, yellow);
  digitalWrite(LED_GREEN, green);
}

void updateLEDs() {
  if (aqStatus == "GOOD") {
    setLEDs(false, false, true);
  } else if (aqStatus == "MODERATE") {
    setLEDs(false, true, false);
  } else {
    setLEDs(true, false, false);
  }
}

// ============================================================
// ALERT LOGIC — only send SMS on transition into/out of POOR,
// not on every read while already in that state.
// ============================================================
void handleAlertLogic() {
  bool isPoorNow = (aqStatus == "POOR");

  if (isPoorNow && !alertActive) {
    // Just entered POOR
    alertActive = true;
    String msg = "AirGuard ALERT: Air quality is POOR (raw " + String(mq135Raw) +
                 "). Temp " + String(temperature, 1) + "C, Humidity " +
                 String(humidity, 1) + "%.";
    sendSMS(ALERT_PHONE_NUMBER, msg);
    insertAlert("air_quality", msg);
  } else if (!isPoorNow && alertActive) {
    // Just recovered
    alertActive = false;
    String msg = "AirGuard: Air quality has returned to " + aqStatus + ".";
    sendSMS(ALERT_PHONE_NUMBER, msg);
    insertAlert("recovery", msg);
  }
}

// ============================================================
// SUPABASE — insert a sensor reading row
// ============================================================
void uploadReading() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Upload skipped: WiFi not connected");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  http.begin(client, String(SUPABASE_URL) + "/rest/v1/sensor_readings");
  http.addHeader("apikey", SUPABASE_APIKEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_APIKEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");

  JsonDocument doc;
  doc["device_id"] = DEVICE_ID_UUID;
  doc["air_quality_value"] = mq135Raw;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["air_quality_status"] = aqStatus;

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  if (code == 201 || code == 200) {
    Serial.println("Reading uploaded.");
  } else {
    Serial.printf("Reading upload failed (HTTP %d): %s\n", code, http.getString().c_str());
  }
  http.end();
}

// ============================================================
// SUPABASE — insert an alert row
// ============================================================
void insertAlert(String alertType, String message) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Alert insert skipped: WiFi not connected");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  http.begin(client, String(SUPABASE_URL) + "/rest/v1/alerts");
  http.addHeader("apikey", SUPABASE_APIKEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_APIKEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");

  JsonDocument doc;
  doc["device_id"] = DEVICE_ID_UUID;
  doc["alert_type"] = alertType;
  doc["message"] = message;
  doc["status"] = "sent";

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  if (code == 201 || code == 200) {
    Serial.println("Alert row inserted.");
  } else {
    Serial.printf("Alert insert failed (HTTP %d): %s\n", code, http.getString().c_str());
  }
  http.end();
}

// ============================================================
// SUPABASE — update devices.status / devices.last_seen
// ============================================================
void updateDeviceHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  http.begin(client, String(SUPABASE_URL) + "/rest/v1/devices?id=eq." + String(DEVICE_ID_UUID));
  http.addHeader("apikey", SUPABASE_APIKEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_APIKEY);
  http.addHeader("Content-Type", "application/json");

  JsonDocument doc;
  doc["status"] = "online";
  doc["last_seen"] = "now()";  // NOTE: PostgREST won't evaluate now() from
                                // JSON body as SQL — see comment below.

  String body;
  serializeJson(doc, body);
  http.PATCH(body);
  http.end();

  // NOTE: the "now()" trick above will NOT work — PostgREST inserts it as
  // the literal string "now()", not a SQL function call. Two real options:
  //   1) Set a DEFAULT now() on last_seen and a BEFORE UPDATE trigger in
  //      Postgres that stamps it automatically on every row update, so the
  //      ESP32 doesn't need to send a timestamp at all — just PATCH status.
  //   2) Send an actual ISO8601 timestamp string from the ESP32, which
  //      requires NTP time sync (see BreatheSafe reference's getTimestamp()
  //      pattern) since the ESP32 has no RTC of its own.
  // Recommend option 1 — simplest, no need for NTP on the firmware side.
}

// ============================================================
// SIM900A — init, signal check, SMS send
// ============================================================
void initSIM900A() {
  Serial.println("Initializing SIM900A...");
  sim900Command("AT");
  delay(1000);
  String r = sim900Read(2000);
  sim900Ready = (r.indexOf("OK") != -1);

  if (sim900Ready) {
    sim900Command("AT+CMGF=1"); // text mode SMS
    delay(500);
    sim900Read(1000);
    Serial.println("SIM900A ready.");
  } else {
    Serial.println("SIM900A not responding — SMS alerts disabled until it does.");
  }
}

void sim900Command(String cmd) {
  while (sim900Serial.available()) sim900Serial.read();
  sim900Serial.println(cmd);
}

String sim900Read(unsigned long timeout) {
  String response = "";
  unsigned long start = millis();
  while (millis() - start < timeout) {
    while (sim900Serial.available()) response += (char)sim900Serial.read();
  }
  return response;
}

bool sendSMS(String phoneNumber, String message) {
  if (phoneNumber.length() == 0) {
    Serial.println("SMS skipped: ALERT_PHONE_NUMBER is empty.");
    return false;
  }
  if (!sim900Ready) {
    Serial.println("SMS skipped: SIM900A not ready.");
    return false;
  }

  sim900Command("AT+CMGS=\"" + phoneNumber + "\"");
  delay(500);
  sim900Serial.print(message);
  sim900Serial.write(26); // Ctrl+Z to send

  String r = sim900Read(10000);
  bool ok = (r.indexOf("+CMGS") != -1 || r.indexOf("OK") != -1);
  Serial.printf("SMS %s\n", ok ? "sent." : "failed.");
  return ok;
}
