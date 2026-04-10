#include <Wire.h>
#include "secrets.h"
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <TinyGPSPlus.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ─── Crash Detection Config ───────────────────────────────────────────────────
#define CRASH_THRESHOLD_G 1.2f   // g-force peak to trigger crash (tune this)
#define CRASH_CONFIRM_MS 100     // sustained high-g window to confirm (ms)
#define CRASH_COOLDOWN_MS 10000  // ignore further events after crash (ms)

// ─── GPS Config ───────────────────────────────────────────────────────────────
#define PIN_GPS_RX 16  // NEO-6M TX → GPIO16 (ESP32 RX2)
#define PIN_GPS_TX 17  // NEO-6M RX ← GPIO17 (ESP32 TX2)

// ─── SINGLE LED PIN ───────────────────────────────────────────────────────────
#define PIN_LED 32  // ONLY LED2 at GPIO32 (220Ω to GND)

// ─── Supabase Config ──────────────────────────────────────────────────────────
// ⚠️ SAME SUPABASE PROJECT AS WEB APP ⚠️
#define SUPABASE_URL "https://qrqnrsiwwftqbhauuwbs.supabase.co"
#define SUPABASE_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFycW5yc2l3d2Z0cWJoYXV1d2JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDg0NzQsImV4cCI6MjA4ODIyNDQ3NH0.Y_8-zaVVmsX3coj2XUNTHuKPwvUE80m3z2Qnt7l1rYI"
#define WIFI_SSID "SimarHotSpot"
#define WIFI_PASS "simar55555"

// ─── Timing ───────────────────────────────────────────────────────────────────
#define GPS_UPLOAD_INTERVAL 30000  // 30 seconds between uploads

// ─── Objects ──────────────────────────────────────────────────────────────────
Adafruit_MPU6050 mpu;
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

// ─── State ────────────────────────────────────────────────────────────────────
bool crashDetected = false;
uint32_t crashStartTime = 0;
uint32_t lastCrashEventTime = 0;
bool aboveThreshold = false;
bool wifiConnected = false;
unsigned long lastGpsUpload = 0;
String deviceId = "vehicle_001";  // Change to your device ID

// GPS data
bool gpsFix = false;
double gpsLat = 0.0;
double gpsLng = 0.0;
float gpsSpeedKmph = 0.0;
String gpsTimeStr = "Unknown";


// ─── Trigger n8n Webhook ─────────────────────────────────────────────────────
void triggerN8N() {
  if (!wifiConnected) {
    Serial.println("⚠️  n8n: No WiFi");
    return;
  }

  Serial.println("🚀 Triggering n8n webhook...");

  HTTPClient http;
  http.begin(N8N_WEBHOOK_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(15000);

  DynamicJsonDocument doc(512);
  doc["device_id"]  = deviceId;
  doc["lat"]        = gpsFix ? gpsLat       : 0.0;
  doc["lng"]        = gpsFix ? gpsLng       : 0.0;
  doc["speed_kmph"] = gpsFix ? gpsSpeedKmph : 0.0;
  doc["gps_fix"]    = gpsFix;
  doc["time"]       = gpsTimeStr;
  doc["satellites"] = gps.satellites.isValid() ? gps.satellites.value() : 0;
  doc["maps_url"]   = gpsFix
    ? "https://maps.google.com/?q=" + String(gpsLat,6) + "," + String(gpsLng,6)
    : "No GPS fix at time of crash";

  String payload;
  serializeJson(doc, payload);
  Serial.println("[n8n] Payload: " + payload);

  int code = http.POST(payload);
  if (code == 200) {
    Serial.println("✅ n8n triggered!");
  } else {
    Serial.print("❌ n8n failed: ");
    Serial.println(code);
    Serial.println(http.getString());
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(PIN_LED, OUTPUT);  // SINGLE LED PIN 32
  digitalWrite(PIN_LED, LOW);

  Serial.println("=== ESP32 Crash + GPS Tracker (1 LED) ===");

  // ── MPU6050 ──
  Wire.begin(21, 22);
  Wire.setClock(100000);
  Serial.println("Initializing MPU6050...");
  if (!mpu.begin(0x68, &Wire)) {
    Serial.println("❌ MPU6050 not detected! Check wiring.");
    // while(1) {
    //   digitalWrite(PIN_LED, (millis()/200)%2);  // Blink error on single LED
    //   delay(100);
    // }
  }
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  Serial.println("✅ MPU6050 READY");

  // ── GPS ──
  gpsSerial.begin(9600, SERIAL_8N1, PIN_GPS_RX, PIN_GPS_TX);
  Serial.println("✅ NEO-6M GPS started @ 9600 baud");

  // ── WiFi + Supabase ──
  // ── WiFi + Supabase (HOTSPOT FIXED) ──
  Serial.print("Connecting WiFi '");
  Serial.print(WIFI_SSID);
  Serial.print("'...");

  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(2000);  // Critical: let hotspot stabilize

  int attempts = 0;
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  while (WiFi.status() != WL_CONNECTED && attempts < 40) {  // 20 → 40 attempts
    delay(500);
    Serial.print(".");
    attempts++;

    // Print detailed status every 5 attempts
    if (attempts % 5 == 0) {
      Serial.println();
      Serial.print("Status: ");
      Serial.print(WiFi.status());
      Serial.print(" (");
      Serial.print(WiFi.RSSI());
      Serial.print(" dBm)");
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println();
    Serial.print("✅ WiFi OK! IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println();
    Serial.println("❌ WiFi FAILED - Common fixes:");
    Serial.println("1. Toggle hotspot OFF/ON");
    Serial.println("2. Connect phone to its own hotspot first");
    Serial.println("3. Check SSID/password spelling");
    Serial.println("4. Try 2.4GHz only (not 5GHz)");
  }


  Serial.println("Crash threshold: " + String(CRASH_THRESHOLD_G, 1) + "g");
  Serial.println("Device ID: " + deviceId);
  Serial.println("LED PIN 32 patterns:");
  Serial.println("  Slow blink  = GPS searching");
  Serial.println("  Solid ON    = GPS fix");
  Serial.println("  Fast blink  = CRASH!");
  Serial.println("=== SYSTEM READY ===");
  Serial.println();
}

void loop() {
  // ── Always poll GPS (non-blocking) ──
  pollGPS();

  // ── Live GPS upload to Supabase (every 30s when fixed) ──
  //uploadGpsToSupabase();

  // ── Crash detection ──
  sensors_event_t accel, gyro, temp;
  mpu.getEvent(&accel, &gyro, &temp);

  float ax = accel.acceleration.x;
  float ay = accel.acceleration.y;
  float az = accel.acceleration.z;

  // Ignore corrupted frames
  if (isnan(ax) || isnan(ay) || isnan(az) || abs(ax) > 40 || abs(ay) > 40 || abs(az) > 40) {
    return;  // Skip silently
  }

  float magnitude = sqrt(ax * ax + ay * ay + az * az);
  float gForce = magnitude / 9.81f;

  checkForCrash(gForce);

  // ── CRASH MODE: Fast blink on single LED ──
  if (crashDetected) {
    digitalWrite(PIN_LED, (millis() / 150) % 2);  // Fast blink ~6Hz
    delay(10);
    return;
  }

  // ── Normal status on single LED (PIN 32) ──
  updateSingleLED();

  // ── Serial output (live monitoring) ──
  Serial.print("g:");
  Serial.print(gForce, 2);
  Serial.print(" GPS:");
  Serial.print(gpsFix ? "FIX" : "NO");
  if (gpsFix) {
    Serial.print(" ");
    Serial.print(gpsLat, 4);
    Serial.print(",");
    Serial.print(gpsLng, 4);
  }
  Serial.println();

  delay(250);
}

// ─── Crash Detection Logic (original) ─────────────────────────────────────────
void checkForCrash(float gForce) {
  uint32_t now = millis();

  // Cooldown after crash
  if (crashDetected && (now - lastCrashEventTime < CRASH_COOLDOWN_MS)) return;

  // Reset after cooldown
  if (crashDetected && (now - lastCrashEventTime >= CRASH_COOLDOWN_MS)) {
    crashDetected = false;
    aboveThreshold = false;
    Serial.println("[CRASH] Reset — monitoring resumed");
  }

  if (gForce >= CRASH_THRESHOLD_G) {
    if (!aboveThreshold) {
      aboveThreshold = true;
      crashStartTime = now;
    } else if ((now - crashStartTime) >= CRASH_CONFIRM_MS) {
      // CRASH CONFIRMED!
      crashDetected = true;
      lastCrashEventTime = now;

      Serial.println("========================================");
      Serial.print("  *** CRASH DETECTED ***  ");
      Serial.print(gForce, 2);
      Serial.println("g");
      Serial.println("========================================");

      uploadGpsToSupabase(); //send only when crash
      triggerN8N();
    }
  } else {
    aboveThreshold = false;
  }
}

// ─── GPS Polling ──────────────────────────────────────────────────────────────
void pollGPS() {
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  if (gps.location.isUpdated() && gps.location.isValid()) {
    gpsFix = true;
    gpsLat = gps.location.lat();
    gpsLng = gps.location.lng();
    gpsSpeedKmph = gps.speed.isValid() ? gps.speed.kmph() : 0.0;

    if (gps.time.isValid()) {
      char buf[20];
      snprintf(buf, sizeof(buf), "%02d:%02d:%02d UTC",
               gps.time.hour(), gps.time.minute(), gps.time.second());
      gpsTimeStr = String(buf);
    }
  }

  // Stale fix timeout
  if (gps.location.isValid() && gps.location.age() > 5000) {
    gpsFix = false;
  }
}

// ─── Supabase Upload — Insert directly into CRASHES table ──────────────────────
void uploadGpsToSupabase() {
  if (!gpsFix || !wifiConnected) return;
  if (millis() - lastGpsUpload < GPS_UPLOAD_INTERVAL) return;

  lastGpsUpload = millis();

  // ── 1. Insert crash into 'crashes' table ──
  HTTPClient http;
  http.begin(String(SUPABASE_URL) + "/rest/v1/crashes");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_KEY));
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");

  // Build location string from coordinates
  String locationStr = String(gpsLat, 4) + "°N, " + String(gpsLng, 4) + "°E";

  DynamicJsonDocument doc(1024);
  doc["lat"] = gpsLat;
  doc["lng"] = gpsLng;
  doc["severity"] = "high";
  doc["device_id"] = deviceId;
  doc["location"] = locationStr;
  doc["status"] = "active";
  doc["victims"] = 1;
  doc["notes"] = "Auto-detected by ESP32 crash sensor. Satellites: " +
                 String(gps.satellites.isValid() ? gps.satellites.value() : 0) +
                 ", HDOP: " + String(gps.hdop.isValid() ? gps.hdop.hdop() : 99.0, 1);

  String payload;
  serializeJson(doc, payload);

  Serial.println("📡 Sending crash to Supabase...");
  Serial.println(payload);

  int httpCode = http.POST(payload);
  String response = http.getString();

  if (httpCode == 201) {
    Serial.println("✅ Crash → Supabase OK");
    Serial.println("   Location: " + locationStr);
  } else {
    Serial.print("❌ Crash insert fail: ");
    Serial.println(httpCode);
    Serial.println(response);
  }

  http.end();

  // ── 2. Also log to gps_locations for tracking history ──
  HTTPClient http2;
  http2.begin(String(SUPABASE_URL) + "/rest/v1/gps_locations");
  http2.addHeader("apikey", SUPABASE_KEY);
  http2.addHeader("Authorization", "Bearer " + String(SUPABASE_KEY));
  http2.addHeader("Content-Type", "application/json");
  http2.addHeader("Prefer", "return=minimal");

  DynamicJsonDocument gpsDoc(512);
  gpsDoc["device_id"] = deviceId;
  gpsDoc["latitude"] = gpsLat;
  gpsDoc["longitude"] = gpsLng;
  gpsDoc["accuracy"] = gps.hdop.isValid() ? gps.hdop.hdop() : 99.0f;
  gpsDoc["satellites"] = gps.satellites.isValid() ? gps.satellites.value() : 0;

  String gpsPayload;
  serializeJson(gpsDoc, gpsPayload);

  int gpsCode = http2.POST(gpsPayload);
  if (gpsCode == 201) {
    Serial.println("📍 GPS log → Supabase OK");
  } else {
    Serial.print("⚠️  GPS log fail: ");
    Serial.println(gpsCode);
  }
  http2.end();
}

// ─── SINGLE LED Logic (PIN 32 only) ───────────────────────────────────────────
void updateSingleLED() {
  static unsigned long lastBlink = 0;
  static bool ledState = false;

  uint32_t now = millis();

  if (!gpsFix) {
    // GPS searching: slow blink ~1Hz
    if (now - lastBlink > 1000) {
      lastBlink = now;
      ledState = !ledState;
      digitalWrite(PIN_LED, ledState);
    }
  } else {
    // GPS fix: solid ON
    digitalWrite(PIN_LED, HIGH);
  }
}
