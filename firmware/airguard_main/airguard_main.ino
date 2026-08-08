/*
  ============================================================
  AirGuard — ESP32 Air Quality Monitor
  ESP32 WROOM-32 + MQ135 + DHT11 + SIM900A + Supabase REST API
  ============================================================

  What this sketch does:
  - Reads MQ135 (air quality, raw ADC via voltage divider) and DHT11
    (temperature/humidity)
  - Classifies air quality into Good / Moderate / Poor / Hazardous
    (must be these EXACT Title-Case strings — Supabase's
    sensor_readings_air_quality_status_check constraint only allows
    'Good','Moderate','Poor','Hazardous', case-sensitive)
  - Drives 3 status LEDs (green/yellow/red) based on that tier
  - Uploads every reading to Supabase `sensor_readings` (over WiFi),
    both on a periodic timer AND immediately on any status change,
    so the dashboard doesn't lag behind the LEDs
  - Inserts a row into `alerts` and sends an SMS via SIM900A when
    air quality crosses into Poor/Hazardous — and again once when it
    recovers (no repeat-spam while still in an alert state)
  - Updates `devices.status` on each cycle
  - Fetches an active recipient list from Supabase's
    `notification_recipients` table periodically, and sends alert SMS
    to every active recipient instead of a single hardcoded number.
    Falls back to ALERT_PHONE_NUMBER if the list is empty/unfetched.

  CONFIRMED CONFIGURATION (as of latest debugging session):
  --------------------------------------------------------------
  - WIRING:
      MQ135 A0    -> GPIO34 (via voltage divider)
      DHT11 DATA  -> GPIO4 (has onboard 5.1k pull-up on this module)
      SIM900A TXD -> GPIO32 (RX2, via voltage divider — SIM900A TXD
                      is 5V logic, GPIO32 only tolerates 3.3V)
      SIM900A RXD -> GPIO33 (TX2, direct — no divider needed, 3.3V
                      reads as valid logic HIGH into SIM900A's RXD)
      SIM900A VCC -> dedicated 5V line + 1000uF cap, NOT through ESP32
      LED Red -> GPIO16   LED Yellow -> GPIO17   LED Green -> GPIO19
    Board confirmed WROOM-class (psramFound() == false), no PSRAM
    conflict on GPIO16/17.
  - SENSOR SWAP: original DHT22 unit tested bad across multiple pins/
    resistor checks and was replaced with a working DHT11.
  - SIM900A: confirmed registered (CREG: 0,1) on TNT/Smart. Boot needs
    a 3s delay after sim900Serial.begin() before sending AT — without
    it, SIM900A can fail to respond when everything boots at once.
  - NOTIFICATION_RECIPIENTS table (run once in Supabase SQL Editor):
      create table notification_recipients (
        id uuid primary key default gen_random_uuid(),
        phone_number text not null,
        label text,
        active boolean not null default true,
        created_at timestamptz not null default now()
      );
      alter table notification_recipients enable row level security;
      create policy "Public insert - notification_recipients"
        on notification_recipients for insert to public with check (true);
      create policy "Public read - notification_recipients"
        on notification_recipients for select to public using (true);
      create policy "Public update - notification_recipients"
        on notification_recipients for update to public using (true);
      create policy "Public delete - notification_recipients"
        on notification_recipients for delete to public using (true);

  SECURITY NOTE: SUPABASE_APIKEY and ALERT_PHONE_NUMBER below are
  plaintext in this file. Fine for now, but if this repo is ever
  pushed to a public GitHub repo (common for capstone projects),
  move these into a separate secrets.h that you .gitignore instead.

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
// CONFIGURATION
// ============================================================
const char* WIFI_SSID     = "K3NT0Z4K1";
const char* WIFI_PASSWORD = "24681012";

const char* SUPABASE_URL    = "https://squzvtpnluaqzzorgdnw.supabase.co";
const char* SUPABASE_APIKEY = "sb_publishable_CQcRxggl6JVPVvPpJOzzsw_lvvstIoB";

// Must match an existing row's id in the `devices` table (uuid).
const char* DEVICE_ID_UUID = "d97e313b-9b7e-4f22-bf9b-2a61da10e965";

// Fallback destination if no active recipients are fetched from
// Supabase yet (e.g. right after boot, or table is empty).
const char* ALERT_PHONE_NUMBER = "+639756011007";

// ============================================================
// PIN MAP (confirmed as physically soldered)
// ============================================================
#define MQ135_PIN   34
#define DHT_PIN     4
#define DHT_TYPE    DHT11

#define LED_RED     16
#define LED_YELLOW  17
#define LED_GREEN   19

// SIM900A on UART2
HardwareSerial sim900Serial(2);
#define SIM900_RX_PIN 32   // ESP32 RX2 <- SIM900A TXD
#define SIM900_TX_PIN 33   // ESP32 TX2 -> SIM900A RXD

DHT dht(DHT_PIN, DHT_TYPE);

// ============================================================
// AQI THRESHOLDS
// ============================================================
const int AQI_GOOD_MAX      = 2900;  // raw ADC <= this -> Good
const int AQI_MODERATE_MAX  = 3500;  // raw ADC <= this -> Moderate
const int AQI_POOR_MAX      = 3900;  // raw ADC <= this -> Poor
                                      // above this      -> Hazardous

// ============================================================
// TIMING (non-blocking, millis-based)
// ============================================================
const unsigned long READ_INTERVAL       = 10000;   // sensor read cadence
const unsigned long UPLOAD_INTERVAL     = 30000;   // Supabase upload cadence
const unsigned long RECIPIENT_INTERVAL  = 300000;  // re-fetch recipient list every 5 min
unsigned long lastRead       = 0;
unsigned long lastUpload     = 0;
unsigned long lastRecipientFetch = 0;

// ============================================================
// STATE
// ============================================================
float temperature = 0, humidity = 0;
int    mq135Raw      = 0;
String aqStatus       = "Good";   // Good / Moderate / Poor / Hazardous
bool   alertActive    = false;    // true while currently in Poor or Hazardous state
bool   sim900Ready    = false;
String prevAqStatus   = aqStatus; // tracks previous status to trigger immediate upload on change

// Cached recipient list, fetched periodically from Supabase
#define MAX_RECIPIENTS 10
String recipientNumbers[MAX_RECIPIENTS];
int    recipientCount = 0;

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
  delay(3000); // let SIM900A finish its own power-on boot before expecting AT replies
  initSIM900A();

  connectWiFi();

  if (WiFi.status() == WL_CONNECTED) {
    delay(1000); // let the network stack settle before the first HTTPS call —
                 // firing immediately after "connected" can race ahead of
                 // DHCP/DNS finishing, causing an immediate connection refusal
    fetchRecipients();
    lastRecipientFetch = millis();
  }
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

    // If the classification changed since the last read, upload immediately
    // instead of waiting for the next periodic cycle — keeps the dashboard
    // in sync with what the LEDs are already showing.
    if (aqStatus != prevAqStatus) {
      Serial.printf("Status changed from %s to %s — triggering immediate upload\n",
                    prevAqStatus.c_str(), aqStatus.c_str());
      prevAqStatus = aqStatus;
      uploadReading();
      lastUpload = now; // avoid an immediate duplicate periodic upload right after
    }

    handleAlertLogic();
  }

  if (now - lastUpload >= UPLOAD_INTERVAL) {
    lastUpload = now;
    uploadReading();
    delay(300); // brief gap so the previous HTTPS socket fully releases
                // before opening another — back-to-back TLS handshakes
                // with no gap can intermittently show "connection refused"
    updateDeviceHeartbeat();
  }

  if (now - lastRecipientFetch >= RECIPIENT_INTERVAL) {
    lastRecipientFetch = now;
    fetchRecipients();
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
    aqStatus = "Good";
  } else if (mq135Raw <= AQI_MODERATE_MAX) {
    aqStatus = "Moderate";
  } else if (mq135Raw <= AQI_POOR_MAX) {
    aqStatus = "Poor";
  } else {
    aqStatus = "Hazardous";
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
  if (aqStatus == "Good") {
    setLEDs(false, false, true);
  } else if (aqStatus == "Moderate") {
    setLEDs(false, true, false);
  } else {
    // Poor and Hazardous both map to red — only 3 LEDs exist, so there's
    // no separate visual tier for Hazardous right now.
    setLEDs(true, false, false);
  }
}

// ============================================================
// SUPABASE — fetch active notification recipients
// ============================================================
void fetchRecipients() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Recipient fetch skipped: WiFi not connected");
    return;
  }

  for (int attempt = 1; attempt <= 2; attempt++) {
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;

    String url = String(SUPABASE_URL) +
                 "/rest/v1/notification_recipients?active=eq.true&select=phone_number";
    http.begin(client, url);
    http.addHeader("apikey", SUPABASE_APIKEY);
    http.addHeader("Authorization", String("Bearer ") + SUPABASE_APIKEY);

    int code = http.GET();
    if (code == 200) {
      String payload = http.getString();
      JsonDocument doc;
      DeserializationError err = deserializeJson(doc, payload);

      if (err) {
        Serial.print("Recipient fetch: JSON parse failed: ");
        Serial.println(err.c_str());
      } else {
        recipientCount = 0;
        for (JsonObject row : doc.as<JsonArray>()) {
          if (recipientCount >= MAX_RECIPIENTS) break;
          const char* num = row["phone_number"];
          if (num != nullptr && strlen(num) > 0) {
            recipientNumbers[recipientCount] = String(num);
            recipientCount++;
          }
        }
        Serial.printf("Recipient fetch: %d active recipient(s) loaded.\n", recipientCount);
      }
      http.end();
      return; // success (even if 0 recipients), no retry needed
    } else if (code < 0) {
      Serial.printf("Recipient fetch attempt %d failed, no server response (%s)\n",
                    attempt, http.errorToString(code).c_str());
    } else {
      Serial.printf("Recipient fetch attempt %d failed (HTTP %d): %s\n",
                    attempt, code, http.getString().c_str());
    }
    http.end();

    if (attempt == 1) {
      delay(500); // brief pause before retrying once
    }
  }
}

// ============================================================
// SMS — send to every cached recipient, falling back to
// ALERT_PHONE_NUMBER if the list is empty
// ============================================================
void sendSMSToAllRecipients(String message) {
  if (recipientCount == 0) {
    Serial.println("No recipients loaded yet — falling back to ALERT_PHONE_NUMBER.");
    sendSMS(ALERT_PHONE_NUMBER, message);
    return;
  }

  int successCount = 0;
  for (int i = 0; i < recipientCount; i++) {
    Serial.printf("Sending SMS %d/%d to %s...\n", i + 1, recipientCount, recipientNumbers[i].c_str());
    bool ok = sendSMS(recipientNumbers[i], message);
    if (ok) successCount++;
    if (i < recipientCount - 1) {
      delay(2000); // SIM900A sends one at a time — gap avoids back-to-back send issues
    }
  }
  Serial.printf("SMS broadcast complete: %d/%d succeeded.\n", successCount, recipientCount);
}

// ============================================================
// ALERT LOGIC — only send SMS on transition into/out of Poor/
// Hazardous, not on every read while already in that state.
// ============================================================
void handleAlertLogic() {
  bool isPoorNow = (aqStatus == "Poor" || aqStatus == "Hazardous");

  if (isPoorNow && !alertActive) {
    alertActive = true;
    String msg = "AirGuard ALERT: Air quality is " + aqStatus + " (raw " + String(mq135Raw) +
                 "). Temp " + String(temperature, 1) + "C, Humidity " +
                 String(humidity, 1) + "%.";
    sendSMSToAllRecipients(msg);
    insertAlert("air_quality", msg);
  } else if (!isPoorNow && alertActive) {
    alertActive = false;
    String msg = "AirGuard: Air quality has returned to " + aqStatus + ".";
    sendSMSToAllRecipients(msg);
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

  for (int attempt = 1; attempt <= 2; attempt++) {
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
      http.end();
      return; // success, no retry needed
    } else if (code < 0) {
      Serial.printf("Reading upload attempt %d failed, no server response (%s). Free heap: %u\n",
                    attempt, http.errorToString(code).c_str(), ESP.getFreeHeap());
    } else {
      Serial.printf("Reading upload attempt %d failed (HTTP %d): %s\n",
                    attempt, code, http.getString().c_str());
    }
    http.end();

    if (attempt == 1) {
      delay(500); // brief pause before retrying once
    }
  }
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
  } else if (code < 0) {
    Serial.printf("Alert insert failed, no server response (%s). Free heap: %u\n",
                  http.errorToString(code).c_str(), ESP.getFreeHeap());
  } else {
    Serial.printf("Alert insert failed (HTTP %d): %s\n", code, http.getString().c_str());
  }
  http.end();
}

// ============================================================
// SUPABASE — update devices.status (last_seen intentionally
// NOT sent from here — needs a DB trigger, see notes above)
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

  String body;
  serializeJson(doc, body);

  int code = http.PATCH(body);
  if (code == 200 || code == 204) {
    Serial.println("Device heartbeat updated.");
  } else if (code < 0) {
    Serial.printf("Heartbeat update failed, no server response (%s)\n",
                  http.errorToString(code).c_str());
  } else {
    Serial.printf("Heartbeat update failed (HTTP %d): %s\n", code, http.getString().c_str());
  }
  http.end();
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
    Serial.println("SMS skipped: phone number is empty.");
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
  Serial.printf("SMS to %s %s\n", phoneNumber.c_str(), ok ? "sent." : "failed.");
  return ok;
}
