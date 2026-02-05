 const options = {
      username: "sofia_esp32",
      password: "sofia123",
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 3000
    }

    const client = mqtt.connect(
      "wss://h6c5ea94.ala.asia-southeast1.emqxsl.com:8084/mqtt",
      options
    )

    const conn = document.getElementById("conn")
    const statusDot = document.getElementById("statusDot")

    // Store last update times
    const lastUpdateTimes = {};
// ===== CHATBOT STATE (REAL-TIME SENSOR CACHE) =====
const sofiaState = {
  temp: null,
  humidity: null,
  gas: null,
  motion: null,
  distance: null,
  water: null,
  flame: null,
  lastTopic: null,
  lastUpdate: null
};
    // Update timestamp
    function updateTimestamp(sensor) {
      const now = new Date();
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const element = document.getElementById(`${sensor}-time`);
      if (element) {
        element.textContent = timeString;
      }
      lastUpdateTimes[sensor] = now;
    }
    // ===== SAFETY / STATUS LOGIC FOR CHATBOT (HARUS DI LUAR client.on("message")) =====
function getTempSafety(temp) {
  if (!isSensorOnline("temp")) return { level: "OFFLINE", note: offlineText("Sensor suhu") };
  if (temp == null || Number.isNaN(temp)) return { level: "NO DATA", note: "Data suhu belum diterima dari MQTT." };
  if (temp < 18 || temp > 28) return { level: "BAHAYA", note: "Suhu di luar batas aman (18–28°C)." };
  if (temp === 18 || temp === 28) return { level: "WASPADA", note: "Suhu berada di batas ambang (18 atau 28°C)." };
  return { level: "AMAN", note: "Suhu normal." };
}

function getHumiditySafety(h) {
  if (!isSensorOnline("humidity")) return { level: "OFFLINE", note: offlineText("Sensor kelembapan") };
  if (h == null || Number.isNaN(h)) return { level: "NO DATA", note: "Data kelembapan belum diterima dari MQTT." };
  if (h < 40 || h > 70) return { level: "BAHAYA", note: "Kelembapan di luar batas aman (40–70%)." };
  if (h === 40 || h === 70) return { level: "WASPADA", note: "Kelembapan berada di batas ambang (40% atau 70%)." };
  return { level: "AMAN", note: "Kelembapan normal." };
}

function getGasSafety(gasVal) {
  if (!isSensorOnline("gas")) return { level: "OFFLINE", note: offlineText("Sensor gas") };
  if (gasVal == null) return { level: "NO DATA", note: "Data gas belum diterima dari MQTT." };

  const s = String(gasVal).toLowerCase();
  const n = parseInt(gasVal, 10);
  const isNum = !Number.isNaN(n);

  if (s.includes("high") || (isNum && n > 500)) return { level: "BAHAYA", note: "Gas tinggi (indikasi bahaya)." };
  if (s.includes("medium") || (isNum && n > 200 && n <= 500)) return { level: "WASPADA", note: "Gas menengah (perlu perhatian)." };
  return { level: "AMAN", note: "Gas rendah/aman." };
}

function getMotionSafety(motionVal) {
  if (!isSensorOnline("motion")) return { level: "OFFLINE", note: offlineText("Sensor motion (PIR)") };
  if (motionVal == null) return { level: "NO DATA", note: "Data motion belum diterima dari MQTT." };

  const night = isNightMode();
  const detected = String(motionVal) === "1" || String(motionVal).toLowerCase().includes("detect");

  if (detected) {
    return { level: night ? "BAHAYA" : "WASPADA", note: night ? "Gerakan terdeteksi (Night Alert)." : "Gerakan terdeteksi." };
  }
  return { level: "AMAN", note: "Tidak ada gerakan (CLEAR)." };
}

function getDistanceSafety(cm) {
  if (!isSensorOnline("distance")) return { level: "OFFLINE", note: offlineText("Sensor jarak (Ultrasonic)") };
  if (cm == null || Number.isNaN(cm)) return { level: "NO DATA", note: "Data jarak belum diterima dari MQTT." };

  const night = isNightMode();
  const dangerLimit = night ? 5 : 10;
  const warningLimit = night ? 15 : 30;

  if (cm < dangerLimit) return { level: "BAHAYA", note: night ? "INTRUSION (Night): objek terlalu dekat." : "Terlalu dekat." };
  if (cm < warningLimit) return { level: "WASPADA", note: night ? "Movement (Night): ada pergerakan dekat." : "Objek cukup dekat." };
  return { level: "AMAN", note: "Jarak aman." };
}

function getWaterSafety(waterVal) {
  if (!isSensorOnline("water")) return { level: "OFFLINE", note: offlineText("Sensor water level") };
  if (waterVal == null) return { level: "NO DATA", note: "Data water level belum diterima dari MQTT." };

  const s = String(waterVal).toLowerCase();
  if (s.includes("high") || s.includes("alert")) return { level: "BAHAYA", note: "Level air tinggi (alert)." };
  if (s.includes("medium") || s.includes("warning")) return { level: "WASPADA", note: "Level air sedang (warning)." };
  return { level: "AMAN", note: "Level air normal." };
}

function getFlameSafety(flameVal) {
  if (!isSensorOnline("flame")) return { level: "OFFLINE", note: offlineText("Sensor flame/api") };
  if (flameVal == null) return { level: "NO DATA", note: "Data flame belum diterima dari MQTT." };

  const detected = String(flameVal) === "1" || String(flameVal).toLowerCase().includes("detected");
  if (detected) return { level: "BAHAYA", note: "Api terdeteksi!" };
  return { level: "AMAN", note: "Tidak ada api." };
}

function getSensorSafety(sensorName) {
  switch (sensorName) {
    case "temp": return getTempSafety(sofiaState.temp);
    case "humidity": return getHumiditySafety(sofiaState.humidity);
    case "gas": return getGasSafety(sofiaState.gas);
    case "motion": return getMotionSafety(sofiaState.motion);
    case "distance": return getDistanceSafety(sofiaState.distance);
    case "water": return getWaterSafety(sofiaState.water);
    case "flame": return getFlameSafety(sofiaState.flame);
    default: return { level: "UNKNOWN", note: "Sensor tidak dikenal." };
  }
}

function badge(level) {
  if (level === "AMAN") return "AMAN";
  if (level === "WASPADA") return "WASPADA";
  if (level === "BAHAYA") return "BAHAYA";
  if (level === "OFFLINE") return "SENSOR BELUM NYALA";
  return "ℹ️ " + level;
}

// ===== SENSOR ONLINE/OFFLINE DETECTOR =====
// Kalau dalam X detik tidak ada update, dianggap sensor/device belum nyala / offline
const SENSOR_OFFLINE_AFTER_SEC = 15;

function isSensorOnline(sensorKey) {
  const last = lastUpdateTimes[sensorKey];
  if (!last) return false;
  const diffSec = (Date.now() - last.getTime()) / 1000;
  return diffSec <= SENSOR_OFFLINE_AFTER_SEC;
}

function offlineText(sensorLabel) {
  return ` ${sensorLabel} belum ada data.\nPastikan ESP32 aktif & publish ke MQTT.`;
}
typeof getSensorSafety


    // Initialize demo values
    function initializeDemoValues() {
      document.getElementById("suhu").innerHTML = '0<span class="card-unit">°C</span>';
      document.getElementById("lembap").innerHTML = '0<span class="card-unit">%</span>';
      document.getElementById("gas").textContent = "LOW";
      document.getElementById("motion").textContent = "CLEAR";
      document.getElementById("distance").innerHTML = '0<span class="card-unit">cm</span>';
      document.getElementById("water").textContent = "NORMAL";
      document.getElementById("flame").textContent = "NONE";
      document.getElementById("status").textContent = "All systems operational. Environment parameters within normal ranges.";
      document.getElementById("ai").textContent = "AI analysis shows normal environmental conditions. No anomalies detected.";
    }

    // Call initialization
    initializeDemoValues();
    

    client.on("connect", () => {
      conn.textContent = " Connected to EMQX Broker"
      conn.style.color = "#10b981";
      statusDot.classList.add("connected");
      
      // Add connection animation
      conn.classList.add("value-updated");
      setTimeout(() => conn.classList.remove("value-updated"), 600);

      client.subscribe("sofia/#", (err) => {
        if (!err) {
          console.log("Subscribed to all SOFIA topics");
        }
      })
    })

    client.on("message", (topic, message) => {
      const value = message.toString()
      // cache untuk chatbot
sofiaState.lastTopic = topic;
sofiaState.lastUpdate = new Date();

if (topic === "sofia/suhu") sofiaState.temp = parseFloat(value);
if (topic === "sofia/lembap") sofiaState.humidity = parseFloat(value);
if (topic === "sofia/gas") sofiaState.gas = value;
if (topic === "sofia/motion") sofiaState.motion = value;
if (topic === "sofia/distance") sofiaState.distance = parseFloat(value);
if (topic === "sofia/water") sofiaState.water = value;
if (topic === "sofia/flame") sofiaState.flame = value;


      let element, displayValue;

     // ===== TOPIC MAPPING =====
const topicMap = {
  suhu: "temp",
  lembap: "humidity",
  gas: "gas",
  motion: "motion",
  distance: "distance",
  water: "water",
  flame: "flame",
  status: "status",
  ai: "ai"
};

// Get sensor name from topic
const raw = topic.split('/')[1];
const sensor = topicMap[raw];
if (sensor) updateTimestamp(sensor);

      if (topic === "sofia/suhu") {
        element = document.getElementById("suhu");
        displayValue = `${value}<span class="card-unit">°C</span>`;
        updateSensorStatus("temp", parseFloat(value), 18, 28);
         
  if (tempChart) updateChart(tempChart, message.toString()); 
      } else if (topic === "sofia/lembap") {
        element = document.getElementById("lembap");
        displayValue = `${value}<span class="card-unit">%</span>`;
        updateSensorStatus("humidity", parseFloat(value), 40, 70);
        if (humChart) updateChart(humChart, message.toString());
      } else if (topic === "sofia/gas") {
        element = document.getElementById("gas");
        displayValue = value.toUpperCase();
        updateGasStatus(value);
        if (gasChart) updateChart(gasChart, message.toString());
      } else if (topic === "sofia/motion") {
  element = document.getElementById("motion");
  const night = isNightMode();
if (motionChart) updateChart(motionChart, message.toString());
  if (value === "1") {
    displayValue = night ? "DETECTED (NIGHT ALERT)" : "DETECTED";
    element.classList.add("flame-alert");
    element.classList.remove("motion-normal");
    updateSensorStatus("motion", 1, 0, 0);
  } else {
    displayValue = "CLEAR";
    element.classList.add("motion-normal");
    element.classList.remove("flame-alert");
    updateSensorStatus("motion", 0, 0, 0);
        }
      } else if (topic === "sofia/distance") {
        element = document.getElementById("distance");
        displayValue = `${value}<span class="card-unit">cm</span>`;
        updateDistanceStatus(parseFloat(value));
       if (distChart) updateChart(distChart, message.toString());
      } else if (topic === "sofia/water") {
        element = document.getElementById("water");
        displayValue = value.toUpperCase();
        updateWaterStatus(value);
        if (waterChart) updateChart(waterChart, message.toString());
      } else if (topic === "sofia/flame") {
        element = document.getElementById("flame");
        if (value === "1" || value.toLowerCase() === "detected") {
          displayValue = "DETECTED";
          element.classList.add("flame-alert");
          updateSensorStatus("flame", 1, 0, 0);
        } else {
          displayValue = "NONE";
          element.classList.remove("flame-alert");
          updateSensorStatus("flame", 0, 0, 0);
        }
      } else if (topic === "sofia/status") {
        element = document.getElementById("status");
        displayValue = value;
        updateStatusCard("status", value);
      } else if (topic === "sofia/ai") {
        element = document.getElementById("ai");
        displayValue = value;
        updateStatusCard("ai", value);
      }

      // Update element if found
      if (element && displayValue !== undefined) {
        // Add animation for value change
        element.classList.add("value-updated");
        setTimeout(() => element.classList.remove("value-updated"), 600);
        
        if (topic === "sofia/suhu" || topic === "sofia/lembap" || topic === "sofia/distance") {
          element.innerHTML = displayValue;
        } else {
          element.textContent = displayValue;
        }
      }
    })

    // Update sensor status indicator
    function updateSensorStatus(sensor, value, min, max) {
      const statusElement = document.querySelector(`.${sensor} .status-indicator`);
      const statusText = document.querySelector(`.${sensor} .card-status span`);
      
      if (!statusElement) return;
      
      if (value < min || value > max) {
        statusElement.className = "status-indicator danger";
        statusText.textContent = "Warning";
      } else if (value === min || value === max) {
        statusElement.className = "status-indicator warning";
        statusText.textContent = "Caution";
      } else {
        statusElement.className = "status-indicator";
        statusText.textContent = sensor === "motion" ? "Clear" : "Optimal";
      }
    }

    // Update gas status
    function updateGasStatus(value) {
      const statusElement = document.querySelector(".gas .status-indicator");
      const statusText = document.querySelector(".gas .card-status span");
      const gasElement = document.getElementById("gas");
      
      if (!statusElement) return;
      
      const val = value.toLowerCase();
      if (val.includes("high") || parseInt(value) > 500) {
        statusElement.className = "status-indicator danger";
        statusText.textContent = "Danger";
        gasElement.className = "card-value alert-high";
      } else if (val.includes("medium") || (parseInt(value) > 200 && parseInt(value) <= 500)) {
        statusElement.className = "status-indicator warning";
        statusText.textContent = "Caution";
        gasElement.className = "card-value alert-medium";
      } else {
        statusElement.className = "status-indicator";
        statusText.textContent = "Safe";
        gasElement.className = "card-value alert-normal";
      }
    }

    // Update distance status
   function updateDistanceStatus(value) {
  const night = isNightMode(); // <-- TAMBAH INI

  const statusElement = document.querySelector(".distance .status-indicator");
  const statusText = document.querySelector(".distance .card-status span");
  const distanceElement = document.getElementById("distance");

  if (!statusElement) return;

  const dangerLimit = night ? 5 : 10;
  const warningLimit = night ? 15 : 30;

  if (value < dangerLimit) {
    statusElement.className = "status-indicator danger";
    statusText.textContent = night ? "INTRUSION (Night)" : "Too close";
    distanceElement.className = "card-value alert-high";
  } else if (value < warningLimit) {
    statusElement.className = "status-indicator warning";
    statusText.textContent = night ? "Movement (Night)" : "Close";
    distanceElement.className = "card-value alert-medium";
  } else {
    statusElement.className = "status-indicator";
    statusText.textContent = "Safe";
    distanceElement.className = "card-value alert-normal";
  }
}


    // Update water status
    function updateWaterStatus(value) {
      const statusElement = document.querySelector(".water .status-indicator");
      const statusText = document.querySelector(".water .card-status span");
      const waterElement = document.getElementById("water");
      
      if (!statusElement) return;
      
      const val = value.toLowerCase();
      if (val.includes("high") || val.includes("alert")) {
        statusElement.className = "status-indicator danger";
        statusText.textContent = "High";
        waterElement.className = "card-value alert-high";
      } else if (val.includes("medium") || val.includes("warning")) {
        statusElement.className = "status-indicator warning";
        statusText.textContent = "Medium";
        waterElement.className = "card-value alert-medium";
      } else {
        statusElement.className = "status-indicator";
        statusText.textContent = "Normal";
        waterElement.className = "card-value alert-normal";
      }
    }
// ===== TIME MODE SYSTEM =====
function isNightMode() {
  const now = new Date();
  const hour = now.getHours();
  // Night mode: 21:00 - 06:00
  return (hour >= 21 || hour < 6);
}

// Update mode display
function updateModeUI() {
  const modeElement = document.getElementById("mode");
  if (!modeElement) return;

  if (isNightMode()) {
    modeElement.textContent = "🌙 NIGHT MODE (High Sensitivity)";
    modeElement.className = "mode night";
  } else {
    modeElement.textContent = "☀️ DAY MODE (Normal Sensitivity)";
    modeElement.className = "mode day";
  }
}

// Refresh mode every minute
setInterval(updateModeUI, 60000);
updateModeUI();

    // Update status card styling
    function updateStatusCard(type, value) {
      const element = document.getElementById(type);
      if (!element) return;
      
      const val = value.toLowerCase();
      if (val.includes("error") || val.includes("alert") || val.includes("warning")) {
        element.classList.remove("normal");
        element.classList.add("alert");
      } else {
        element.classList.remove("alert");
        element.classList.add("normal");
      }
    }

    client.on("error", (err) => {
      conn.textContent = " Connection Error - Retrying..."
      conn.style.color = "#ef4444";
      statusDot.classList.remove("connected");
      console.error(err)
    })

    // Add hover effects for cards
    document.querySelectorAll('.card').forEach(card => {
      card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-10px)';
      });
      
      card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
      });
    });

    // Simulate data updates for demo (remove in production)
    setInterval(() => {
      const now = new Date();
      const seconds = now.getSeconds();
      
      // Simulate random sensor updates every 10 seconds
      if (seconds % 10 === 0) {
        const sensors = ['temp', 'humidity', 'gas', 'motion', 'distance', 'water', 'flame'];
        const randomSensor = sensors[Math.floor(Math.random() * sensors.length)];
        updateTimestamp(randomSensor);
      }
    }, 1000);
    const maxPoints = 20;

function createChart(ctx, label, color) {
  return new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: label,
        data: [],
        borderColor: color,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      animation: false,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

const tempChart = createChart(
  document.getElementById("tempChart"),
  "Suhu (°C)",
  "#f97316"
);

const humChart = createChart(
  document.getElementById("humChart"),
  "Kelembapan (%)",
  "#38bdf8"
);

const gasChart = createChart(
  document.getElementById("gasChart"),
  "Gas",
  "#a855f7"
);

const distChart = createChart(
  document.getElementById("distChart"),
  "Jarak (cm)",
  "#22c55e"
);

const waterChart = createChart(
  document.getElementById("waterChart"),
  "Water Level",
  "#0ea5e9"
);
const motionChart = createChart(
  document.getElementById("motionChart"),
  "Motion PIR (0 = Clear, 1 = Detected)",
  "#ef4444"
);

function updateChart(chart, value) {
  const now = new Date().toLocaleTimeString();

  chart.data.labels.push(now);
  chart.data.datasets[0].data.push(Number(value));

  if (chart.data.labels.length > maxPoints) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }

  chart.update();
}

// ===== CHATBOT ENGINE =====
const botMessages = document.getElementById("botMessages");
const botInput = document.getElementById("botInput");
const botSend = document.getElementById("botSend");
const botModeBadge = document.getElementById("botModeBadge");
const botConnBadge = document.getElementById("botConnBadge");

function botAddMessage(text, who="bot") {
  const div = document.createElement("div");
  div.className = `bot-msg ${who}`;
  const ts = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
  div.innerHTML = `${text}\n<div class="bot-meta">${who === "bot" ? "SOFIA Assistant" : "Kamu"} • ${ts}</div>`;
  botMessages.appendChild(div);
  botMessages.scrollTop = botMessages.scrollHeight;
}

function formatVal(name) {
  // mapping state key -> key timestamp yang kamu pakai (temp, humidity, gas, dst)
  const sensorKeyMap = {
    temp: "temp",
    humidity: "humidity",
    gas: "gas",
    motion: "motion",
    distance: "distance",
    water: "water",
    flame: "flame"
  };

  const sensorKey = sensorKeyMap[name];
  const online = sensorKey ? isSensorOnline(sensorKey) : true;

  if (!online) {
    // nilai kosong khusus chatbot
    return "BELUM NYALA";
  }

  switch (name) {
    case "temp": return sofiaState.temp == null ? "BELUM ADA DATA" : `${sofiaState.temp.toFixed(1)} °C`;
    case "humidity": return sofiaState.humidity == null ? "BELUM ADA DATA" : `${sofiaState.humidity.toFixed(0)} %`;
    case "distance": return sofiaState.distance == null ? "BELUM ADA DATA" : `${sofiaState.distance.toFixed(0)} cm`;
    case "gas": return sofiaState.gas == null ? "BELUM ADA DATA" : `${String(sofiaState.gas).toUpperCase()}`;
    case "water": return sofiaState.water == null ? "BELUM ADA DATA" : `${String(sofiaState.water).toUpperCase()}`;
    case "motion":
      if (sofiaState.motion == null) return "BELUM ADA DATA";
      return sofiaState.motion === "1" ? "DETECTED" : "CLEAR";
    case "flame":
      if (sofiaState.flame == null) return "BELUM ADA DATA";
      return (sofiaState.flame === "1" || String(sofiaState.flame).toLowerCase().includes("detected")) ? "DETECTED" : "NONE";
    default:
      return "—";
  }
}


function getModeText(){
  return isNightMode() ? "NIGHT MODE (High Sensitivity)" : "DAY MODE (Normal Sensitivity)";
}

function updateBotBadges(){
  if (botModeBadge) botModeBadge.textContent = `MODE: ${isNightMode() ? "NIGHT" : "DAY"}`;
}
setInterval(updateBotBadges, 60000);
updateBotBadges();

// MQTT badge (sinkron dengan event connect/error)
client.on("connect", () => {
  if (botConnBadge) botConnBadge.textContent = "MQTT: CONNECTED";
});
client.on("error", () => {
  if (botConnBadge) botConnBadge.textContent = "MQTT: ERROR";
});

function helpText(){
  return [
    "Aku bisa bantu monitor SOFIA secara real-time.",
    "",
    "Perintah cepat:",
    "- 'suhu sekarang' / 'temperature'",
    "- 'kelembapan sekarang' / 'humidity'",
    "- 'gas sekarang'",
    "- 'motion sekarang'",
    "- 'jarak sekarang' / 'distance'",
    "- 'water level sekarang'",
    "- 'flame sekarang'",
    "- 'mode sekarang'",
    "- 'tentang sofia' / 'sofia itu apa'",
  ].join("\n");
}

function aboutSofiaText(){
  return [
    "SOFIA adalah dashboard Smart Environment untuk monitoring IoT berbasis MQTT (EMQX) + visualisasi real-time.",
    "",
    "Sensor yang dipantau:",
    `- Suhu: ${formatVal("temp")}`,
    `- Kelembapan: ${formatVal("humidity")}`,
    `- Gas: ${formatVal("gas")}`,
    `- Motion: ${formatVal("motion")}`,
    `- Jarak: ${formatVal("distance")}`,
    `- Water level: ${formatVal("water")}`,
    `- Flame: ${formatVal("flame")}`,
    "",
    `Mode saat ini: ${getModeText()}`,
  ].join("\n");
}

function answer(queryRaw){
  const q = queryRaw.toLowerCase().trim();
if (q.includes("status semua") || q.includes("ringkasan") || q.includes("summary")) {
  const sensors = [
    ["Suhu", "temp"],
    ["Kelembapan", "humidity"],
    ["Gas", "gas"],
    ["Motion", "motion"],
    ["Jarak", "distance"],
    ["Water", "water"],
    ["Flame", "flame"],
  ];

  const lines = sensors.map(([label, key]) => {
    const st = getSensorSafety(key);
    return `- ${label}: ${formatVal(key)} → ${badge(st.level)}`;
  });

  return `Ringkasan status SOFIA (${getModeText()}):\n` + lines.join("\n");
}

  // mode
  if (q.includes("mode") || q.includes("malam") || q.includes("night") || q.includes("day")) {
    return `Mode saat ini: ${getModeText()}\n(Night aktif jam 21:00 - 06:00)`;
  }

  // tentang sofia
  if (q.includes("tentang sofia") || q.includes("sofia itu") || q.includes("apa itu sofia") || q === "sofia") {
    return aboutSofiaText();
  }

  // help
  if (q === "help" || q.includes("bantuan") || q.includes("apa yang bisa")) {
    return helpText();
  }

  // sensor queries
  if (q.includes("suhu") || q.includes("temperature") || q.includes("temp")) {
  const st = getSensorSafety("temp");
  return `Suhu sekarang: ${formatVal("temp")}\nStatus: ${badge(st.level)}\nCatatan: ${st.note}`;
}

  if (q.includes("lembap") || q.includes("kelembapan") || q.includes("humidity")) {
  const st = getSensorSafety("humidity");
  return `Kelembapan sekarang: ${formatVal("humidity")}\nStatus: ${badge(st.level)}\nCatatan: ${st.note}`;
}
  
if (q.includes("gas")) {
  const st = getSensorSafety("gas");
  return `Gas sekarang: ${formatVal("gas")}\nStatus: ${badge(st.level)}\nCatatan: ${st.note}`;
}

  if (q.includes("motion") || q.includes("gerak") || q.includes("pir")) {
  const st = getSensorSafety("motion");
  return `Motion sekarang: ${formatVal("motion")}\nStatus: ${badge(st.level)}\nCatatan: ${st.note}\nMode: ${getModeText()}`;
}
 if (q.includes("jarak") || q.includes("distance") || q.includes("ultrasonic")) {
  const st = getSensorSafety("distance");
  return `Jarak sekarang: ${formatVal("distance")}\nStatus: ${badge(st.level)}\nCatatan: ${st.note}\nMode: ${getModeText()}`;
}
 if (q.includes("water") || q.includes("level")) {
  const st = getSensorSafety("water");
  return `Water level sekarang: ${formatVal("water")}\nStatus: ${badge(st.level)}\nCatatan: ${st.note}`;
}
  if (q.includes("flame") || q.includes("api") || q.includes("fire")) {
  const st = getSensorSafety("flame");
  return `Flame sekarang: ${formatVal("flame")}\nStatus: ${badge(st.level)}\nCatatan: ${st.note}`;
}

  // fallback
  return "Aku belum paham. Coba ketik: 'help' atau tanya 'suhu sekarang', 'mode sekarang', 'tentang sofia'.";
}

function handleSend(){
  const text = botInput.value.trim();
  if (!text) return;
  botAddMessage(text, "user");
  botInput.value = "";
  const reply = answer(text);
  botAddMessage(reply, "bot");
}

// send handlers
if (botSend) botSend.addEventListener("click", handleSend);
if (botInput) botInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSend();
});

// quick buttons
document.querySelectorAll(".quick-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const q = btn.getAttribute("data-q");
    botInput.value = q;
    handleSend();
  });
});

// greet
botAddMessage("Halo! Aku SOFIA Assistant. Tanyakan sensor real-time: suhu, kelembapan, gas, motion, jarak, water, flame. Ketik 'help' untuk daftar perintah.", "bot");
botAddMessage(`Mode saat ini: ${getModeText()}`, "bot");
