#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

Adafruit_MPU6050 mpu;

// ─── Crash Detection Config ───────────────────────────────────────────────────
#define CRASH_THRESHOLD_G       1.2f   // g-force peak to trigger crash (tune this)
#define CRASH_CONFIRM_MS        100     // sustained high-g window to confirm (ms)
#define CRASH_COOLDOWN_MS       10000   // ignore further events after crash (ms)
#define PIN_LED1 25  // Status LED 1 (220Ω to GND)
#define PIN_LED2 32  // Status LED 2 (220Ω to GND)

// ─── State ────────────────────────────────────────────────────────────────────
bool     crashDetected      = false;
uint32_t crashStartTime     = 0;      // when g crossed threshold
uint32_t lastCrashEventTime = 0;      // timestamp of last confirmed crash
bool     aboveThreshold     = false;  // are we currently in a high-g window?

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED2, OUTPUT);
  digitalWrite(PIN_LED2, LOW);

  Wire.begin(21, 22);
  Wire.setClock(100000);

  Serial.println("Initializing MPU6050...");
  if (!mpu.begin(0x68, &Wire)) {
    Serial.println("MPU6050 not detected! Halting.");
  }
  Serial.println("MPU6050 READY");

  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  Serial.print("Crash threshold: ");
  Serial.print(CRASH_THRESHOLD_G, 1);
  Serial.println(" g");
}

// ─── Crash Detection Logic ────────────────────────────────────────────────────
void checkForCrash(float gForce) {
  uint32_t now = millis();

  // Respect cooldown after a confirmed crash
  if (crashDetected && (now - lastCrashEventTime < CRASH_COOLDOWN_MS)) return;

  if (crashDetected && (now - lastCrashEventTime >= CRASH_COOLDOWN_MS)) {
    crashDetected  = false;
    aboveThreshold = false;
    digitalWrite(PIN_LED2, LOW);
    Serial.println("[CRASH] Cooldown expired — monitoring resumed.");
  }

  if (gForce >= CRASH_THRESHOLD_G) {
    if (!aboveThreshold) {
      // Just crossed the threshold — start the confirmation window
      aboveThreshold = true;
      crashStartTime = now;
    } else if ((now - crashStartTime) >= CRASH_CONFIRM_MS) {
      // Sustained high-g long enough → CRASH CONFIRMED
      crashDetected      = true;
      lastCrashEventTime = now;
      digitalWrite(PIN_LED2, HIGH);

      Serial.println("========================================");
      Serial.print  ("  *** CRASH DETECTED ***  Peak: ");
      Serial.print  (gForce, 2);
      Serial.println(" g");
      Serial.println("========================================");

      // TODO: add GSM alert / SD card log / BLE notification here
    }
  } else {
    // Dropped back below threshold — reset window (spike, not a crash)
    aboveThreshold = false;
  }
}

void loop() {
  sensors_event_t accel, gyro, temp;
  mpu.getEvent(&accel, &gyro, &temp);

  float ax = accel.acceleration.x;
  float ay = accel.acceleration.y;
  float az = accel.acceleration.z;

  // Ignore corrupted frames
  if (isnan(ax) || isnan(ay) || isnan(az) ||
      abs(ax) > 40 || abs(ay) > 40 || abs(az) > 40) {
    Serial.println("[I2C] Corrupted frame ignored");
    delay(100);
    return;
  }

  float magnitude = sqrt(ax*ax + ay*ay + az*az);
  float gForce    = magnitude / 9.81f;

  checkForCrash(gForce);

  // ── Stop normal logging once crash is confirmed ──
  if (crashDetected) {
    digitalWrite(PIN_LED2, HIGH);
    delay(10);
    return;   // skip serial print, do nothing until cooldown expires
  }

  Serial.print("X: ");   Serial.print(ax, 2);
  Serial.print("  Y: "); Serial.print(ay, 2);
  Serial.print("  Z: "); Serial.print(az, 2);
  Serial.print("  | Total g: "); Serial.print(gForce, 2);
  Serial.print(crashDetected ? "  [CRASH!]" : "");
  Serial.println();

  delay(200);  // tighter loop for better crash resolution
}