#include <Arduino.h>
#include <TinyGPSPlus.h>
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include "secrets.h"


// ==============================
// DEVICE & WIFI CONFIGURATION
// ==============================

const char* DEVICE_ID = "GPS-002";

// WIFI_SSID, WIFI_PASSWORD, dan BACKEND_BASE_URL berasal dari secrets.h.

WebServer server(80);

bool lastWiFiConnected = false;
bool wifiAttemptActive = false;
bool wifiWaitingRetry = false;
unsigned long wifiAttemptStartedAt = 0;
unsigned long wifiRetryStartedAt = 0;
const unsigned long wifiConnectTimeout = 30000;
const unsigned long wifiRetryDelay = 3000;

unsigned long lastHeartbeat = 0;
unsigned long lastLocationUpload = 0;
const unsigned long heartbeatInterval = 5000;
const unsigned long locationUploadInterval = 10000;


// ==============================
// PIN CONFIGURATION
// ==============================

#define GPS_RX_PIN 4
#define BUTTON_PIN 1
#define LED_RED 6
#define LED_GREEN 10


// ==============================
// GPS OBJECT
// ==============================

TinyGPSPlus gps;
HardwareSerial GPSserial(1);


// ==============================
// GPS DATA STORAGE
// ==============================

double latestLat = 0;
double latestLon = 0;
int latestSat = 0;
bool gpsFixed = false;
bool gpsDataReceived = false;
unsigned long lastGpsByteAt = 0;


// ==============================
// BUTTON VARIABLES
// ==============================

bool lastButtonReading = HIGH;
bool buttonState = HIGH;
unsigned long lastDebounceTime = 0;
const unsigned long debounceDelay = 50;


// ==============================
// EVENT STATE
// ==============================

bool emergencyActive = false;
unsigned long eventStart = 0;
const unsigned long eventDuration = 2000;


// ==============================
// SERIAL TIMER
// ==============================

unsigned long lastPrint = 0;


// ==============================
// WEB SERVER HANDLERS
// ==============================

void handleHome() {
  String html = "<!DOCTYPE html><html><head>";
  html += "<meta name='viewport' content='width=device-width,initial-scale=1'>";
  html += "<meta http-equiv='refresh' content='2'>";
  html += "<title>TANDAIN GPS</title></head><body>";
  html += "<h1>TANDAIN GPS Tracker</h1>";
  html += "<p><b>Device ID:</b> " + String(DEVICE_ID) + "</p>";
  html += "<p><b>Wi-Fi:</b> connected</p>";

  if (gpsFixed) {
    html += "<p><b>GPS:</b> fixed</p>";
    html += "<p><b>Latitude:</b> " + String(latestLat, 6) + "</p>";
    html += "<p><b>Longitude:</b> " + String(latestLon, 6) + "</p>";
    html += "<p><b>Satellites:</b> " + String(latestSat) + "</p>";
    html += "<p><a href='https://www.google.com/maps?q=";
    html += String(latestLat, 6) + "," + String(latestLon, 6);
    html += "'>Buka koordinat di peta</a></p>";
  } else {
    html += "<p><b>GPS:</b> searching / belum mendapatkan fix</p>";
  }

  html += "<p><b>Emergency:</b> ";
  html += emergencyActive ? "ACTIVE" : "inactive";
  html += "</p>";
  html += "<p><a href='/location'>Lihat data JSON</a></p>";
  html += "</body></html>";

  server.sendHeader("Cache-Control", "no-store");
  server.send(200, "text/html", html);
}


void handleLocation() {
  String json = "{";
  json += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  json += "\"gps_fixed\":" + String(gpsFixed ? "true" : "false") + ",";

  if (gpsFixed) {
    json += "\"latitude\":" + String(latestLat, 6) + ",";
    json += "\"longitude\":" + String(latestLon, 6) + ",";
    json += "\"satellites\":" + String(latestSat) + ",";
  } else {
    json += "\"latitude\":null,";
    json += "\"longitude\":null,";
    json += "\"satellites\":" + String(gps.satellites.value()) + ",";
  }

  json += "\"emergency\":" + String(emergencyActive ? "true" : "false");
  json += "}";

  server.sendHeader("Cache-Control", "no-store");
  server.send(200, "application/json", json);
}


void handleHealth() {
  String json = "{";
  json += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  json += "\"server\":\"online\",";
  json += "\"wifi_connected\":";
  json += WiFi.status() == WL_CONNECTED ? "true" : "false";
  json += ",\"ip\":\"" + WiFi.localIP().toString() + "\",";
  json += "\"uptime_seconds\":" + String(millis() / 1000) + ",";
  json += "\"gps_status\":\"";
  json += gpsFixed ? "fixed" : "not_ready";
  json += "\"}";

  server.sendHeader("Cache-Control", "no-store");
  server.send(200, "application/json", json);
}


void handleNotFound() {
  server.send(404, "text/plain", "Endpoint tidak ditemukan");
}


// ==============================
// BACKEND FUNCTIONS
// ==============================

String currentGpsStatus() {
  if (gpsFixed) {
    return "fixed";
  }

  if (millis() > 5000 &&
      (!gpsDataReceived || millis() - lastGpsByteAt > 5000)) {
    return "no_data";
  }

  return "searching";
}


bool postJson(const String& path, const String& payload) {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  HTTPClient http;
  String url = String(BACKEND_BASE_URL) + path;
  http.setTimeout(2500);

  if (!http.begin(url)) {
    Serial.println("BACKEND: URL INVALID");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  int responseCode = http.POST(payload);

  Serial.print("BACKEND: POST ");
  Serial.print(path);
  Serial.print(" -> ");
  Serial.println(responseCode);

  if (responseCode < 0) {
    Serial.print("BACKEND ERROR: ");
    Serial.println(HTTPClient::errorToString(responseCode));
    Serial.print("BACKEND URL  : ");
    Serial.println(url);
    Serial.print("LOCAL IP     : ");
    Serial.println(WiFi.localIP());
    Serial.print("GATEWAY      : ");
    Serial.println(WiFi.gatewayIP());
    Serial.print("RSSI         : ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  }

  http.end();
  return responseCode >= 200 && responseCode < 300;
}


void sendHeartbeat() {
  String payload = "{";
  payload += "\"tag_id\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"gps_status\":\"" + currentGpsStatus() + "\",";
  payload += "\"satellites\":" + String(gps.satellites.value()) + ",";
  payload += "\"ip_address\":\"" + WiFi.localIP().toString() + "\"";
  payload += "}";

  postJson("/api/devices/heartbeat", payload);
}


void sendLocation() {
  if (!gpsFixed) {
    return;
  }

  String payload = "{";
  payload += "\"tag_id\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"lat\":" + String(latestLat, 6) + ",";
  payload += "\"lng\":" + String(latestLon, 6);
  payload += "}";

  postJson("/api/locations", payload);
}


void updateBackend() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  if (millis() - lastHeartbeat >= heartbeatInterval) {
    lastHeartbeat = millis();
    sendHeartbeat();
  }

  if (gpsFixed && millis() - lastLocationUpload >= locationUploadInterval) {
    lastLocationUpload = millis();
    sendLocation();
  }
}


// ==============================
// WIFI FUNCTIONS
// ==============================

void beginWiFiAttempt() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  wifiAttemptActive = true;
  wifiWaitingRetry = false;
  wifiAttemptStartedAt = millis();

  Serial.print("Wi-Fi : CONNECTING TO ");
  Serial.println(WIFI_SSID);
}


void startWiFi() {
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(DEVICE_ID);
  WiFi.setAutoReconnect(true);
  beginWiFiAttempt();
}


void updateWiFi() {
  wl_status_t wifiStatus = WiFi.status();
  bool wifiConnected = wifiStatus == WL_CONNECTED;

  if (wifiConnected) {
    wifiAttemptActive = false;
    wifiWaitingRetry = false;

    if (!lastWiFiConnected) {
      lastWiFiConnected = true;
      Serial.println();
      Serial.println("Wi-Fi : CONNECTED");
      Serial.print("IP     : ");
      Serial.println(WiFi.localIP());
      Serial.print("GATEWAY: ");
      Serial.println(WiFi.gatewayIP());
      Serial.print("BSSID  : ");
      Serial.println(WiFi.BSSIDstr());
      Serial.print("RSSI   : ");
      Serial.print(WiFi.RSSI());
      Serial.println(" dBm");
      Serial.print("URL    : http://");
      Serial.println(WiFi.localIP());
      Serial.print("JSON   : http://");
      Serial.print(WiFi.localIP());
      Serial.println("/location");
    }

    return;
  }

  if (lastWiFiConnected) {
    lastWiFiConnected = false;
    Serial.println("Wi-Fi : DISCONNECTED");
  }

  // Jangan panggil WiFi.begin() lagi ketika driver masih mencoba koneksi.
  if (wifiAttemptActive) {
    if (millis() - wifiAttemptStartedAt >= wifiConnectTimeout) {
      Serial.print("Wi-Fi : TIMEOUT, STATUS CODE ");
      Serial.println(static_cast<int>(wifiStatus));

      WiFi.disconnect(false, false);
      wifiAttemptActive = false;
      wifiWaitingRetry = true;
      wifiRetryStartedAt = millis();
    }
    return;
  }

  if (wifiWaitingRetry && millis() - wifiRetryStartedAt >= wifiRetryDelay) {
    Serial.println("Wi-Fi : RETRYING");
    beginWiFiAttempt();
  }
}


// ==============================
// SETUP
// ==============================

void setup() {
  Serial.begin(115200);

  GPSserial.begin(
    9600,
    SERIAL_8N1,
    GPS_RX_PIN,
    -1
  );

  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_RED, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);

  digitalWrite(LED_RED, LOW);
  digitalWrite(LED_GREEN, LOW);

  delay(1000);

  Serial.println();
  Serial.println("==============================");
  Serial.println("       TANDAIN SYSTEM");
  Serial.println("==============================");
  Serial.println("ESP32  : READY");
  Serial.println("GPS    : STARTING");
  Serial.println("BUTTON : READY");

  startWiFi();

  server.on("/", HTTP_GET, handleHome);
  server.on("/health", HTTP_GET, handleHealth);
  server.on("/location", HTTP_GET, handleLocation);
  server.onNotFound(handleNotFound);
  server.begin();

  Serial.println("SERVER : READY");
}


// ==============================
// MAIN LOOP
// ==============================

void loop() {
  updateGPS();
  updateButton();
  updateLED();
  updateWiFi();
  updateBackend();
  server.handleClient();
}


// ==============================
// GPS FUNCTION
// ==============================

void updateGPS() {
  while (GPSserial.available()) {
    char gpsByte = GPSserial.read();
    gpsDataReceived = true;
    lastGpsByteAt = millis();
    gps.encode(gpsByte);
  }

  if (
    gps.location.isValid() &&
    gps.location.age() < 5000
  ) {
    latestLat = gps.location.lat();
    latestLon = gps.location.lng();
    latestSat = gps.satellites.value();
    gpsFixed = true;
  } else {
    gpsFixed = false;
  }

  if (millis() - lastPrint >= 2000) {
    lastPrint = millis();
    Serial.println("------------------------------");

    if (millis() > 5000 &&
        (!gpsDataReceived || millis() - lastGpsByteAt > 5000)) {
      Serial.println("GPS : NO DATA");
    } else if (gpsFixed) {
      Serial.println("GPS : FIXED");
      Serial.print("LAT : ");
      Serial.println(latestLat, 6);
      Serial.print("LON : ");
      Serial.println(latestLon, 6);
      Serial.print("SAT : ");
      Serial.println(latestSat);
    } else {
      Serial.println("GPS : SEARCHING");
      Serial.print("SAT : ");
      Serial.println(gps.satellites.value());
    }

    Serial.print("WIFI: ");
    Serial.println(WiFi.status() == WL_CONNECTED ? "CONNECTED" : "CONNECTING");
  }
}


// ==============================
// BUTTON FUNCTION
// ==============================

void updateButton() {
  bool reading = digitalRead(BUTTON_PIN);

  if (reading != lastButtonReading) {
    lastDebounceTime = millis();
  }

  if (millis() - lastDebounceTime > debounceDelay) {
    if (reading != buttonState) {
      buttonState = reading;

      if (buttonState == LOW) {
        createEmergencyEvent();
      }
    }
  }

  lastButtonReading = reading;
}


// ==============================
// EMERGENCY EVENT
// ==============================

void createEmergencyEvent() {
  emergencyActive = true;
  eventStart = millis();

  Serial.println();
  Serial.println("==============================");
  Serial.println("BUTTON PRESSED");

  if (gpsFixed) {
    Serial.println("TANDAIN EVENT : READY");
    Serial.print("LAT : ");
    Serial.println(latestLat, 6);
    Serial.print("LON : ");
    Serial.println(latestLon, 6);
    Serial.print("SAT : ");
    Serial.println(latestSat);
  } else {
    Serial.println("TANDAIN EVENT : GPS NOT READY");
  }

  Serial.println("==============================");
}


// ==============================
// LED STATUS
// ==============================

void updateLED() {
  if (emergencyActive) {
    digitalWrite(LED_RED, HIGH);
    digitalWrite(LED_GREEN, LOW);

    if (millis() - eventStart >= eventDuration) {
      emergencyActive = false;
    }

    return;
  }

  if (gpsFixed) {
    digitalWrite(LED_RED, LOW);
    digitalWrite(LED_GREEN, HIGH);
  } else {
    digitalWrite(LED_RED, LOW);
    digitalWrite(LED_GREEN, LOW);
  }
}
