
    const options = {
      username: "sofia_esp32",
      password: "sofia123",
      clean: true,
      connectTimeout: 4000
    }

    const client = mqtt.connect(
      "wss://h6c5ea94.ala.asia-southeast1.emqxsl.com:8084/mqtt",
      options
    )

    const conn = document.getElementById("conn")
    const statusDot = document.getElementById("statusDot")

    // Initialize with random values for demo (will be replaced by real data)
    function initializeDemoValues() {
      document.getElementById("suhu").textContent = "0°C";
      document.getElementById("lembap").textContent = "0%";
      document.getElementById("gas").textContent = "LOW";
      document.getElementById("motion").textContent = "CLEAR";
      document.getElementById("distance").textContent = "0cm";
      document.getElementById("water").textContent = "NORMAL";
       document.getElementById("flame").textContent = "0";
      document.getElementById("status").textContent = "All systems operational";
      document.getElementById("ai").textContent = "Environment normal, no anomalies detected";
     
    }

    // Call initialization
    initializeDemoValues();

    client.on("connect", () => {
      conn.textContent = "✅ Connected to EMQX Broker"
      conn.style.color = "#10b981";
      statusDot.classList.add("connected");
      
      // Add connection animation
      conn.classList.add("value-updated");
      setTimeout(() => conn.classList.remove("value-updated"), 500);

      client.subscribe("sofia/#")
    })

    client.on("message", (topic, message) => {
      const value = message.toString()
      let element, displayValue;

      if (topic === "sofia/suhu") {
        element = document.getElementById("suhu");
        displayValue = value + "°C";
      } else if (topic === "sofia/lembap") {
        element = document.getElementById("lembap");
        displayValue = value + "%";
      } else if (topic === "sofia/gas") {
        element = document.getElementById("gas");
        displayValue = value;
        
        // Color code gas levels
        if (value.toLowerCase().includes("high") || parseInt(value) > 500) {
          element.style.color = "#ef4444";
        } else if (value.toLowerCase().includes("medium") || (parseInt(value) > 200 && parseInt(value) <= 500)) {
          element.style.color = "#f59e0b";
        } else {
          element.style.color = "#10b981";
        }
      } else if (topic === "sofia/motion") {
        element = document.getElementById("motion");
        if (value === "1") {
          displayValue = "DETECTED";
          element.classList.add("motion-alert");
          element.classList.remove("motion-normal");
        } else {
          displayValue = "CLEAR";
          element.classList.add("motion-normal");
          element.classList.remove("motion-alert");
        }
      } else if (topic === "sofia/distance") {
        element = document.getElementById("distance");
        displayValue = value + "cm";
        
        // Color code distance (red if too close)
        if (parseInt(value) < 10) {
          element.style.color = "#ef4444";
        } else if (parseInt(value) < 30) {
          element.style.color = "#f59e0b";
        } else {
          element.style.color = "#10b981";
        }
      } else if (topic === "sofia/water") {
        element = document.getElementById("water");
        displayValue = value;
        
        // Color code water level
        if (value.toLowerCase().includes("high") || value.toLowerCase().includes("alert")) {
          element.style.color = "#ef4444";
        } else if (value.toLowerCase().includes("medium") || value.toLowerCase().includes("warning")) {
          element.style.color = "#f59e0b";
        } else {
          element.style.color = "#10b981";
        }
      } 
      else if (topic === "sofia/flame") {
  element = document.getElementById("flame");

  if (value === "1") {
    displayValue = "🔥 API TERDETEKSI";
    element.classList.add("flame-alert");
  } else {
    displayValue = "✅ AMAN";
    element.classList.remove("flame-alert");
  }
}
      else if (topic === "sofia/status") {
        element = document.getElementById("status");
        displayValue = value;
        
        // Update status card styling
        const statusContent = document.getElementById("status");
        if (value.toLowerCase().includes("error") || value.toLowerCase().includes("alert") || value.toLowerCase().includes("warning")) {
          statusContent.classList.remove("normal");
          statusContent.classList.add("alert");
        } else {
          statusContent.classList.remove("alert");
          statusContent.classList.add("normal");
        }
      } else if (topic === "sofia/ai") {
        element = document.getElementById("ai");
        displayValue = value;
        
        // Update AI card styling
        const aiContent = document.getElementById("ai");
        if (value.toLowerCase().includes("alert") || value.toLowerCase().includes("warning") || value.toLowerCase().includes("anomaly")) {
          aiContent.classList.remove("normal");
          aiContent.classList.add("alert");
        } else {
          aiContent.classList.remove("alert");
          aiContent.classList.add("normal");
        }
      }


      // Update element if found
      if (element && displayValue) {
        // Add animation for value change
        element.classList.add("value-updated");
        setTimeout(() => element.classList.remove("value-updated"), 500);
        
        element.textContent = displayValue;
      }
    })

    client.on("error", (err) => {
      conn.textContent = "❌ Connection Error - Retrying..."
      conn.style.color = "#ef4444";
      statusDot.classList.remove("connected");
      console.error(err)
    })

    // Add hover effects for cards
    document.querySelectorAll('.card').forEach(card => {
      card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-8px)';
      });
      
      card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
      });
    });
  