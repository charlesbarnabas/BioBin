<?php
// --- LOGIKA PENERIMA DATA (Dijalankan saat ESP32 mengirim POST) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $json = file_get_contents('php://input');
    if (!empty($json)) {
        file_put_contents('data_sensor.json', $json);
        echo "Data Tersimpan";
    }
    exit; // Berhenti di sini jika ini adalah request POST
}

// --- LOGIKA TAMPILAN (Dijalankan saat kamu buka di Browser) ---
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Sensor Erlangga</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #1a1a2e; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .container { background: #16213e; padding: 30px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); width: 320px; text-align: center; border: 1px solid #0f3460; }
        h2 { margin-bottom: 20px; color: #e94560; }
        .card { background: #0f3460; padding: 15px; border-radius: 12px; margin-bottom: 15px; }
        .value { font-size: 24px; font-weight: bold; display: block; color: #4ecca3; }
        .label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #95a5a6; }
        #status { font-size: 10px; color: #555; margin-top: 10px; }
    </style>
</head>
<body>

<div class="container">
    <h2>DETEKSI LIMBAH ORGANIK</h2>
    
    <div class="card">
        <span class="label">Temperatur</span>
        <span id="temp" class="value">--°C</span>
    </div>

    <div class="card">
        <span class="label">Kelembapan</span>
        <span id="hum" class="value">--%</span>
    </div>

    <div class="card">
        <span class="label">Gas MQ135</span>
        <span id="gas" class="value">--</span>
    </div>

    <div id="status">Menghubungkan ke sensor...</div>
</div>

<script>
    function updateDashboard() {
        // Mengambil data dari file JSON yang dibuat oleh script ini sendiri
        fetch('data_sensor.json?t=' + Date.now())
            .then(res => res.json())
            .then(data => {
                document.getElementById('temp').innerText = data.temp + "°C";
                document.getElementById('hum').innerText = data.hum + "%";
                document.getElementById('gas').innerText = data.gas;
                document.getElementById('status').innerText = "Last Update: " + new Date().toLocaleTimeString();
            })
            .catch(err => {
                document.getElementById('status').innerText = "Belum ada data dari ESP32";
            });
    }

    // Refresh setiap 2 detik
    setInterval(updateDashboard, 2000);
    updateDashboard();
</script>

</body>
</html>