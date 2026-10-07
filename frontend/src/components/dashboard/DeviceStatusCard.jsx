const GPS_LABEL = {
  fixed: "GPS fixed",
  searching: "Mencari satelit",
  no_data: "UART GPS tidak terbaca",
  unknown: "Status GPS belum diketahui",
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "short",
  timeStyle: "medium",
});

function formatDate(value) {
  return value ? dateFormatter.format(new Date(value)) : "-";
}

function hasCoordinates(device) {
  return (
    typeof device.latest_location?.lat === "number" &&
    typeof device.latest_location?.lng === "number"
  );
}

export default function DeviceStatusCard({ devices, error = "" }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm xl:col-span-12">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">Perangkat GPS</h2>
          <p className="text-xs text-muted">Status platform dari heartbeat ESP32; toleransi offline 30 detik</p>
        </div>
        <span className="text-sm font-semibold text-ink">
          {devices.filter((device) => device.online).length}/{devices.length} online
        </span>
      </div>

      {error && (
        <p className="mb-3 rounded-xl bg-triase-merah-soft px-4 py-3 text-sm text-triase-merah">
          Status perangkat belum dapat diperbarui: {error}
        </p>
      )}

      {devices.length === 0 ? (
        <p className="rounded-xl bg-page px-4 py-3 text-sm text-muted">
          Belum ada heartbeat dari ESP32.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {devices.map((device) => (
            <article key={device.tag_id} className="rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm text-ink">{device.tag_id}</strong>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    device.online
                      ? "bg-triase-hijau-soft text-triase-hijau"
                      : "bg-triase-merah-soft text-triase-merah"
                  }`}
                >
                  {device.online ? "Online" : "Offline"}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-muted">GPS</dt>
                <dd className="font-medium text-ink">{GPS_LABEL[device.gps_status] ?? device.gps_status}</dd>
                <dt className="text-muted">Satelit</dt>
                <dd className="font-medium text-ink">{device.satellites}</dd>
                <dt className="text-muted">IP</dt>
                <dd className="font-medium text-ink">{device.ip_address || "-"}</dd>
                <dt className="text-muted">Koordinat</dt>
                <dd className="font-medium text-ink">
                  {hasCoordinates(device) ? (
                    <a
                      className="text-blue-600 underline"
                      href={`https://www.google.com/maps?q=${device.latest_location.lat},${device.latest_location.lng}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {device.latest_location.lat.toFixed(6)}, {device.latest_location.lng.toFixed(6)}
                    </a>
                  ) : (
                    "Belum tersedia"
                  )}
                </dd>
                <dt className="text-muted">Update lokasi</dt>
                <dd className="font-medium text-ink">{formatDate(device.latest_location?.timestamp)}</dd>
                <dt className="text-muted">Heartbeat</dt>
                <dd className="font-medium text-ink">{formatDate(device.last_seen)}</dd>
                <dt className="text-muted">Tombol</dt>
                <dd className="font-medium text-ink">
                  {device.button_press_count > 0
                    ? `${device.button_press_count} kali ditekan`
                    : "Belum pernah ditekan"}
                </dd>
                <dt className="text-muted">Tekan terakhir</dt>
                <dd className="font-medium text-ink">{formatDate(device.last_button_pressed_at)}</dd>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
