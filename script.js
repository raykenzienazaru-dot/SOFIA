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

    // Initialize all timestamps
    function initializeTimestamps() {
      const sensors = ['temp', 'humidity', 'gas', 'motion', 'distance', 'water', 'flame'];
      sensors.forEach(sensor => updateTimestamp(sensor));
    }

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
    initializeTimestamps();

    client.on("connect", () => {
      conn.textContent = "✅ Connected to EMQX Broker"
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
      let element, displayValue;

      // Get sensor name from topic
      const sensor = topic.split('/')[1];
      updateTimestamp(sensor);

      if (topic === "sofia/suhu") {
        element = document.getElementById("suhu");
        displayValue = `${value}<span class="card-unit">°C</span>`;
        updateSensorStatus("temp", parseFloat(value), 18, 28);
      } else if (topic === "sofia/lembap") {
        element = document.getElementById("lembap");
        displayValue = `${value}<span class="card-unit">%</span>`;
        updateSensorStatus("humidity", parseFloat(value), 40, 70);
      } else if (topic === "sofia/gas") {
        element = document.getElementById("gas");
        displayValue = value.toUpperCase();
        updateGasStatus(value);
      } else if (topic === "sofia/motion") {
  element = document.getElementById("motion");
  const night = isNightMode();

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
      } else if (topic === "sofia/water") {
        element = document.getElementById("water");
        displayValue = value.toUpperCase();
        updateWaterStatus(value);
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
      const statusElement = document.querySelector(".distance .status-indicator");
      const statusText = document.querySelector(".distance .card-status span");
      const distanceElement = document.getElementById("distance");
      
      if (!statusElement) return;
      
      // Threshold berbeda siang & malam
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
      conn.textContent = "❌ Connection Error - Retrying..."
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