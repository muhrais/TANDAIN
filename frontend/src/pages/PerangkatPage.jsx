import { useMemo, useRef, useState } from "react";
import { RefreshCw, Lightbulb, Link2, Unlink, Radar, X } from "lucide-react";
import FilterChip from "../components/common/FilterChip";
import { usePolling } from "../hooks/usePolling";
import { listDevices, pairDevice, unpairDevice, identifyDevice } from "../services/deviceService";
import { ApiClientError } from "../lib/apiClient";
import { NFC_SUPPORTED, readNfcSerial, nfcErrorMessage } from "../lib/nfc";
import { formatAgo } from "../lib/map";
import { STATUS_LABEL } from "../lib/activity";

const GPS_LABEL = {
  fixed: "GPS fix",
  searching: "Mencari satelit",
  no_data: "GPS tidak terbaca",
  unknown: "Status GPS belum diketahui",
};

const DOT_COLOR = {
  merah: "bg-triase-merah",
  kuning: "bg-triase-kuning",
  hijau: "bg-triase-hijau",
};

const FILTERS = [
  { key: "semua", label: "Semua" },
  { key: "belum", label: "Belum di-pairing" },
  { key: "terpakai", label: "Dipakai korban" },
  { key: "bebas", label: "Bebas" },
];

function matchesFilter(device, filter) {
  if (filter === "belum") return !device.paired;
  if (filter === "terpakai") return Boolean(device.victim);
  if (filter === "bebas") return device.paired && !device.victim;
  return true;
}

function errorText(err) {
  return err instanceof ApiClientError ? err.message : nfcErrorMessage(err);
}

// Panel pairing satu gelang: LED gelang dikedipkan dulu supaya koordinator
// yakin gelang fisik yang dipegang sama dengan stiker, baru NFC-nya dibaca.
function PairingPanel({ device, onDone, onClose }) {
  const [manualUid, setManualUid] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(null);
  const abortRef = useRef(null);

  async function pair(uid, force = false) {
    setError("");
    setConflict(null);
    setBusy(true);
    try {
      await pairDevice(device.tag_id, uid, { force });
      onDone(`${device.tag_id} berhasil di-pairing ke NFC ${uid}.`);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "NFC_ALREADY_PAIRED") {
        setConflict({ uid, pairedTo: err.details?.paired_to });
      } else {
        setError(errorText(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleReadNfc() {
    setError("");
    const controller = new AbortController();
    abortRef.current = controller;
    setListening(true);
    try {
      const uid = await readNfcSerial({ signal: controller.signal });
      setListening(false);
      await pair(uid);
    } catch (err) {
      setListening(false);
      if (err?.name !== "AbortError") setError(errorText(err));
    }
  }

  function handleClose() {
    abortRef.current?.abort();
    onClose();
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-brand/20 bg-brand/5 p-3 text-[13px]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-ink">
          LED <span className="font-semibold">{device.tag_id}</span> sedang berkedip. Pastikan stiker gelang yang kamu
          pegang sama, lalu baca NFC gelang itu.
        </p>
        <button type="button" onClick={handleClose} aria-label="Tutup panel pairing" className="text-muted hover:text-ink">
          <X size={16} />
        </button>
      </div>

      {NFC_SUPPORTED && (
        <button
          type="button"
          onClick={handleReadNfc}
          disabled={busy || listening}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-brand px-3 py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60 sm:w-auto"
        >
          <Radar size={16} className={listening ? "animate-pulse" : ""} />
          {listening ? "Tempelkan gelang ke HP..." : "Baca NFC gelang"}
        </button>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (manualUid.trim()) pair(manualUid.trim());
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          type="text"
          value={manualUid}
          onChange={(event) => setManualUid(event.target.value)}
          placeholder={NFC_SUPPORTED ? "atau ketik UID manual" : "UID NFC, mis. 04:9f:f5:73:bf:2a:81"}
          aria-label="UID NFC manual"
          className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
        <button
          type="submit"
          disabled={busy || !manualUid.trim()}
          className="rounded-md border border-black/10 bg-white px-3 py-1.5 font-semibold text-ink hover:bg-page disabled:opacity-60"
        >
          {busy ? "Menyimpan..." : "Simpan UID"}
        </button>
      </form>

      {!NFC_SUPPORTED && (
        <p className="text-xs text-muted">Web NFC hanya ada di Chrome Android. Di perangkat ini UID diketik manual.</p>
      )}

      {conflict && (
        <div role="alert" className="space-y-2 rounded-md bg-triase-kuning-soft px-3 py-2 text-triase-kuning-dark">
          <p>
            NFC {conflict.uid} sudah dipasangkan ke <span className="font-semibold">{conflict.pairedTo}</span>.
          </p>
          <button
            type="button"
            onClick={() => pair(conflict.uid, true)}
            disabled={busy}
            className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-ink shadow-sm hover:bg-page"
          >
            Pindahkan ke {device.tag_id}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-triase-merah">
          {error}
        </p>
      )}
    </div>
  );
}

function DeviceRow({ device, now, onChanged, onMessage }) {
  const [pairing, setPairing] = useState(false);
  const [busy, setBusy] = useState(false);
  const blinking = device.identify_until && new Date(device.identify_until) > now;

  async function run(action, successMessage) {
    setBusy(true);
    try {
      await action();
      if (successMessage) onMessage(successMessage);
      onChanged();
    } catch (err) {
      onMessage(errorText(err), true);
    } finally {
      setBusy(false);
    }
  }

  function openPairing() {
    setPairing(true);
    run(() => identifyDevice(device.tag_id));
  }

  function handleUnpair() {
    const note = device.victim ? ` Gelang ini sedang dipakai ${device.victim.nama || "korban"}.` : "";
    if (!window.confirm(`Lepas pairing NFC dari ${device.tag_id}?${note}`)) return;
    run(() => unpairDevice(device.tag_id), `Pairing NFC ${device.tag_id} dilepas.`);
  }

  return (
    <li className="px-4 py-4 md:px-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink">{device.tag_id}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                device.online ? "bg-triase-hijau-soft text-triase-hijau" : "bg-triase-merah-soft text-triase-merah"
              }`}
            >
              {device.online ? "Online" : "Offline"}
            </span>
            {blinking && (
              <span className="flex items-center gap-1 rounded-full bg-triase-kuning-soft px-2 py-0.5 text-[11px] font-semibold text-triase-kuning-dark">
                <Lightbulb size={12} className="animate-pulse" /> Berkedip
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[13px] text-muted">
            {GPS_LABEL[device.gps_status] ?? device.gps_status} · {formatAgo(now - new Date(device.last_seen))}
          </div>
        </div>

        <div className="text-[13px]">
          {device.paired ? (
            <>
              <div className="font-semibold text-ink">NFC terpasang</div>
              <div className="truncate font-mono text-xs text-muted">{device.nfc_uid}</div>
            </>
          ) : (
            <div className="font-semibold text-triase-kuning-dark">Belum di-pairing</div>
          )}
        </div>

        <div className="min-w-0 text-[13px]">
          {device.victim ? (
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_COLOR[device.victim.kategori_triase]}`} />
              <span className="truncate text-ink">
                {device.victim.nama || "(tanpa nama)"} · {STATUS_LABEL[device.victim.status_korban]}
              </span>
            </div>
          ) : (
            <span className="text-muted">Bebas, belum dipakai korban</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          <button
            type="button"
            onClick={() => run(() => identifyDevice(device.tag_id), `LED ${device.tag_id} berkedip ±15 detik.`)}
            disabled={busy || !device.online}
            title={device.online ? "Kedipkan LED gelang" : "Perangkat offline"}
            className="flex items-center gap-1.5 rounded-md border border-black/10 px-2.5 py-1.5 text-[13px] font-semibold text-ink hover:bg-page disabled:opacity-50"
          >
            <Lightbulb size={14} /> Identifikasi
          </button>
          <button
            type="button"
            onClick={openPairing}
            disabled={busy || pairing}
            className="flex items-center gap-1.5 rounded-md bg-brand px-2.5 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            <Link2 size={14} /> {device.paired ? "Pairing ulang" : "Pairing NFC"}
          </button>
          {device.paired && (
            <button
              type="button"
              onClick={handleUnpair}
              disabled={busy}
              aria-label={`Lepas pairing ${device.tag_id}`}
              title="Lepas pairing"
              className="flex items-center rounded-md border border-black/10 px-2 py-1.5 text-muted hover:bg-page hover:text-triase-merah disabled:opacity-50"
            >
              <Unlink size={14} />
            </button>
          )}
        </div>
      </div>

      {pairing && (
        <PairingPanel
          device={device}
          onClose={() => setPairing(false)}
          onDone={(message) => {
            setPairing(false);
            onMessage(message);
            onChanged();
          }}
        />
      )}
    </li>
  );
}

export default function PerangkatPage() {
  const { data: devices, error, refresh } = usePolling(listDevices);
  const [filter, setFilter] = useState("semua");
  const [message, setMessage] = useState(null);

  const rows = useMemo(() => (devices ?? []).filter((d) => matchesFilter(d, filter)), [devices, filter]);
  const now = new Date();

  function showMessage(text, isError = false) {
    setMessage({ text, isError });
  }

  return (
    <div className="min-w-0 flex-1 space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink md:text-2xl">Perangkat</h1>
          <p className="mt-1 text-sm text-muted">
            Pairing NFC gelang ke GPS-nya dilakukan sekali saat persiapan alat. Petugas lapangan cukup scan NFC.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className={`flex items-center gap-1.5 text-sm font-medium ${error ? "text-triase-merah" : "text-muted hover:text-ink"}`}
        >
          {error ? "Terputus" : "Muat ulang"}
          <RefreshCw size={14} />
        </button>
      </div>

      {devices && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
          <span>
            <span className="font-semibold text-ink">{devices.length}</span> gelang
          </span>
          <span>
            <span className="font-semibold text-ink">{devices.filter((d) => d.online).length}</span> online
          </span>
          <span>
            <span className="font-semibold text-triase-kuning-dark">{devices.filter((d) => !d.paired).length}</span>{" "}
            belum di-pairing
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter perangkat">
        {FILTERS.map((f) => (
          <FilterChip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </FilterChip>
        ))}
      </div>

      {message && (
        <p
          role="status"
          className={`flex items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-sm ${
            message.isError ? "bg-triase-merah-soft text-triase-merah" : "bg-triase-hijau-soft text-triase-hijau"
          }`}
        >
          {message.text}
          <button type="button" onClick={() => setMessage(null)} aria-label="Tutup pesan">
            <X size={14} />
          </button>
        </p>
      )}

      <div className="rounded-xl bg-white shadow-sm">
        {!devices ? (
          <p className="p-5 text-sm text-muted">{error ? error.message : "Memuat perangkat..."}</p>
        ) : rows.length === 0 ? (
          <p className="p-5 text-sm text-muted">
            {devices.length === 0
              ? "Belum ada perangkat. Nyalakan gelang supaya terdaftar lewat heartbeat."
              : "Tidak ada perangkat untuk filter ini."}
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {rows.map((device) => (
              <DeviceRow key={device.tag_id} device={device} now={now} onChanged={refresh} onMessage={showMessage} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
