import { NextResponse } from "next/server";

const SENSOR_URL = "https://www.erlanggabriawa.my.id/data_sensor.json";

interface RawSensorResponse {
  temp?: number;
  hum?: number;
  gas?: number;
}

export async function GET() {
  try {
    const res = await fetch(SENSOR_URL, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Gagal mengambil data dari server pusat" },
        { status: 502 }
      );
    }

    const data = (await res.json()) as RawSensorResponse;

    return NextResponse.json(
      {
        temp: data?.temp ?? null,
        hum: data?.hum ?? null,
        gas: data?.gas ?? null,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Tidak dapat terhubung ke server pusat" },
      { status: 500 }
    );
  }
}

