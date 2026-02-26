"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

type Tone = "ok" | "critical" | "pending";

interface SensorState {
  temp: number | null;
  hum: number | null;
  gas: number | null;
  lastUpdated: number | null;
}

interface Status {
  label: string;
  tone: Tone;
}

interface SensorPoint {
  t: number;
  temp: number | null;
  hum: number | null;
  gas: number | null;
}

type DeviceId = string;

const DEFAULT_DEVICE_ID: DeviceId = "biobin-kelurahan-1";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

function classifyStatus(sensor: SensorState | null): Status {
  if (!sensor || sensor.lastUpdated === null) {
    return {
      label: "Menunggu data dari ESP32...",
      tone: "pending",
    };
  }

  const now = Date.now();
  const ageSec = (now - sensor.lastUpdated) / 1000;

  if (ageSec > 30) {
    return {
      label: "Data sudah lama, cek kembali koneksi WiFi BioBin & jaringan kelurahan.",
      tone: "critical",
    };
  }

  return {
    label: `Update terakhir: ${new Date(sensor.lastUpdated).toLocaleTimeString("id-ID")}`,
    tone: "ok",
  };
}

export default function Page() {
  const [devices, setDevices] = useState<Record<DeviceId, SensorState>>({});
  const [history, setHistory] = useState<Record<DeviceId, SensorPoint[]>>({});
  const [selectedDeviceId] = useState<DeviceId>(DEFAULT_DEVICE_ID);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchSensor() {
      try {
        const res = await fetch("https://www.erlanggabriawa.my.id/data_sensor.json", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Gagal mengambil data sensor");
        const data: { temp?: number; hum?: number; gas?: number } = await res.json();

        if (!mounted) return;

        const sensor: SensorState = {
          temp: data?.temp ?? null,
          hum: data?.hum ?? null,
          gas: data?.gas ?? null,
          lastUpdated: Date.now(),
        };

        setDevices((prev) => ({
          ...prev,
          [DEFAULT_DEVICE_ID]: sensor,
        }));

        setHistory((prev) => {
          const prevList = prev[DEFAULT_DEVICE_ID] ?? [];
          const nextList: SensorPoint[] = [
            ...prevList,
            {
              t: Date.now(),
              temp: sensor.temp,
              hum: sensor.hum,
              gas: sensor.gas,
            },
          ].slice(-30);

          return {
            ...prev,
            [DEFAULT_DEVICE_ID]: nextList,
          };
        });

        setError(null);
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Gagal mengambil data sensor");
        }
        setLoading(false);
      }
    }

    fetchSensor();
    const interval = setInterval(fetchSensor, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const currentSensor: SensorState | null = devices[selectedDeviceId] ?? null;
  const status = classifyStatus(currentSensor);
  const currentHistory: SensorPoint[] = history[selectedDeviceId] ?? [];

  const chartData = {
    labels: currentHistory.map((p) =>
      new Date(p.t).toLocaleTimeString([], {
        hour12: false,
        minute: "2-digit",
        second: "2-digit",
      })
    ),
    datasets: [
      {
        label: "Temperatur (°C)",
        data: currentHistory.map((p) => p.temp),
        borderColor: "#f97316",
        backgroundColor: "rgba(248, 113, 22, 0.25)",
        tension: 0.3,
        borderWidth: 2,
        spanGaps: true,
      },
      {
        label: "Kelembapan (%)",
        data: currentHistory.map((p) => p.hum),
        borderColor: "#22c55e",
        backgroundColor: "rgba(34, 197, 94, 0.25)",
        tension: 0.3,
        borderWidth: 2,
        spanGaps: true,
      },
      {
        label: "Gas MQ135 (raw)",
        data: currentHistory.map((p) => p.gas),
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56, 189, 248, 0.25)",
        tension: 0.3,
        borderWidth: 2,
        spanGaps: true,
        yAxisID: "y1",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: "#374151",
          font: { size: 11 },
          padding: 12,
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "#e5e7eb",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#6b7280",
          maxTicksLimit: 6,
          font: { size: 10 },
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      y: {
        ticks: {
          color: "#6b7280",
          font: { size: 10 },
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      y1: {
        position: "right" as const,
        ticks: {
          color: "#3b82f6",
          font: { size: 10 },
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  const currentDate = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="dashboard-wrapper">
      <div className="top-bar">
        <div className="top-location">Kelurahan Mekarjaya, Bandung</div>
        <div className="top-time">{currentDate}</div>
      </div>

      <div className="dashboard-main-grid">
        <div className="dashboard-column-left">
          <div className="info-card">
            <div className="weather-section">
              <div className="temp-display">
                {currentSensor?.temp ?? "--"}
                <span className="temp-unit">°C</span>
              </div>
              <div className="weather-condition">
                <span className="weather-icon">☀️</span>
                <span>Cerah</span>
              </div>
            </div>
            <div className="garden-info">
              <div className="garden-name">BioBin Kelurahan 08</div>
              <div className="garden-id">PL-02J</div>
              <div className="garden-area">200 m²</div>
            </div>
          </div>

          <div className="map-card">
            <div className="map-container">
              <div className="map-plot active">PL-02J</div>
              <div className="map-plot inactive">PL-70T</div>
            </div>
          </div>

          <div className="metrics-grid">
            <div className="metric-card health-card">
              <div className="metric-icon">🌿</div>
              <div className="metric-value-row health">
                <span className="metric-value-large">94</span>
                <span className="metric-unit-inline">%</span>
              </div>
              <div className="metric-label">Baik</div>
              <div className="metric-advice">
                Kompos dalam kondisi sehat dan proses berjalan optimal.
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">💨</div>
              <div className="metric-value-row">
                <span className="metric-value">{currentSensor?.gas ?? "--"}</span>
                <span className="metric-unit-inline">m/s</span>
              </div>
              <div className="metric-advice">
                Pastikan aliran udara di sekitar BioBin tetap cukup.
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">🌡️</div>
              <div className="metric-value-row">
                <span className="metric-value">{currentSensor?.temp ?? "--"}</span>
                <span className="metric-unit-inline">°C</span>
              </div>
              <div className="metric-advice">
                Usahakan suhu inti kompos stabil di rentang 30–60°C.
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">🧪</div>
              <div className="metric-value">7.6</div>
              <div className="metric-advice">
                Tambahkan kompos yang lebih asam untuk menyeimbangkan pH.
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">💧</div>
              <div className="metric-value-row">
                <span className="metric-value">{currentSensor?.hum ?? "--"}</span>
                <span className="metric-unit-inline">%</span>
              </div>
              <div className="metric-advice">
                Pastikan ventilasi cukup untuk mencegah jamur.
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">🌱</div>
              <div className="metric-value-row">
                <span className="metric-value">65</span>
                <span className="metric-unit-inline">%</span>
              </div>
              <div className="metric-advice">
                Terus pantau agar kadar kelembapan tetap konsisten.
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-column-middle">
          <div className="device-panel">
            <div className="panel-header">
              <h3 className="panel-title">Perangkat</h3>
            </div>
            <div className="device-summary">
              <span>Sensor: 3</span>
              <span>Kamera: 0</span>
            </div>
            <div className="device-list">
              <div className="device-item">
                <span className="status-dot green"></span>
                <div className="device-info">
                  <div className="device-name">DHT22: Sensor Suhu & Kelembapan</div>
                  <div className="device-id">#TH001 • Sensor</div>
                </div>
              </div>
              <div className="device-item">
                <span className="status-dot green"></span>
                <div className="device-info">
                  <div className="device-name">MQ135: Sensor Gas</div>
                  <div className="device-id">#GS002 • Sensor</div>
                </div>
              </div>
              <div className="device-item">
                <span className="status-dot orange"></span>
                <div className="device-info">
                  <div className="device-name">ESP32 Kontroler</div>
                  <div className="device-id">#ESP001 • Kontroler</div>
                  <div className="device-warning">▲ Gangguan sinyal sejak 08:02</div>
                </div>
              </div>
            </div>

            <div className="device-chart-card">
              <h3 className="panel-title">Grafik Sensor</h3>
              <div className="device-chart-container">
                <Line data={chartData} options={chartOptions} />
              </div>
              <p className="status-text">
                {error ? `Gagal membaca data sensor (${error})` : status.label}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

