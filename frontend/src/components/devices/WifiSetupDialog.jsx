import { useEffect, useRef, useState } from "react";
import { Bluetooth, Wifi, X } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

const SERVICE = "a3fe05c4-6b19-4dd7-ad16-fffb6439a0c0";
const WRITE = "a3fe05c4-6b19-4dd7-ad16-fffb6439a0c1";
const READ = "a3fe05c4-6b19-4dd7-ad16-fffb6439a0c2";
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const pathFor = (tag) => `/api/devices/${encodeURIComponent(tag)}`;
const fieldClass = "w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";
const secondaryClass = "flex items-center gap-2 rounded-lg border border-black/15 px-3 py-2 text-sm font-semibold text-ink hover:bg-page disabled:opacity-50";

async function readBluetooth(session) {
  return JSON.parse(decoder.decode(await session.read.readValue()));
}

async function waitForResult(read, signal) {
  const end = Date.now() + 85_000;
  while (Date.now() < end) {
    signal.throwIfAborted();
    const outcome = await read();
    if (outcome && outcome.status !== "pending") return outcome;
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  throw new Error("Perangkat belum mengonfirmasi. Periksa status perangkat sebelum mencoba lagi.");
}

export default function WifiSetupDialog({ device, onClose, onChanged }) {
  const dialog = useRef(null);
  const bluetooth = useRef(null);
  const lifetime = useRef(null);
  const [mode, setMode] = useState(device?.online ? "remote" : "bluetooth");
  const [pairedTag, setPairedTag] = useState("");
  const [networks, setNetworks] = useState([]);
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    const element = dialog.current;
    element.showModal();
    return () => {
      controller.abort();
      bluetooth.current?.device.gatt.disconnect();
      bluetooth.current = null;
      element.close();
    };
  }, []);

  async function run(label, operation) {
    const signal = lifetime.current.signal;
    setBusy(label);
    setError("");
    setMessage("");
    try {
      await operation(signal);
    } catch (err) {
      if (!signal.aborted) setError(err.name === "NotFoundError" ? "Perangkat Bluetooth belum dipilih." : err.message);
    } finally {
      if (!signal.aborted) setBusy("");
    }
  }

  async function pairBluetooth() {
    if (!navigator.bluetooth) throw new Error("Buka TANDAIN di Chrome dengan Bluetooth aktif dan akses HTTPS.");
    const signal = lifetime.current.signal;
    bluetooth.current?.device.gatt.disconnect();
    setPairedTag("");
    const selected = await navigator.bluetooth.requestDevice({ filters: [{ services: [SERVICE] }] });
    signal.throwIfAborted();
    try {
      const gatt = await selected.gatt.connect();
      const service = await gatt.getPrimaryService(SERVICE);
      const read = await service.getCharacteristic(READ);
      const write = await service.getCharacteristic(WRITE);
      const hello = await readBluetooth({ read });
      if (!hello.tag_id || (device && hello.tag_id !== device.tag_id)) {
        throw new Error(`Pilih Bluetooth ${device?.tag_id ?? "perangkat TANDAIN"} yang sesuai.`);
      }
      signal.throwIfAborted();
      bluetooth.current = { device: selected, read, write, tag: hello.tag_id };
      selected.addEventListener("gattserverdisconnected", () => {
        if (!signal.aborted && bluetooth.current?.device === selected) setPairedTag("");
      }, { once: true });
      setPairedTag(hello.tag_id);
      setMessage(`Bluetooth ${hello.tag_id} tersambung.`);
    } catch (err) {
      selected.gatt.disconnect();
      throw err;
    }
  }

  async function command(payload, signal) {
    if (mode === "remote") {
      const path = `${pathFor(device.tag_id)}/wifi`;
      const { id } = await apiClient.post(path, payload);
      return waitForResult(() => apiClient.get(`${path}/${id}`), signal);
    }
    const session = bluetooth.current;
    if (!session?.device.gatt.connected) throw new Error("Sambungkan Bluetooth perangkat dulu.");
    const { challenge } = await readBluetooth(session);
    const { id, packet } = await apiClient.post(`${pathFor(session.tag)}/wifi-bluetooth`, { ...payload, challenge });
    const bytes = encoder.encode(`${packet}\n`);
    for (let offset = 0; offset < bytes.length; offset += 20) {
      signal.throwIfAborted();
      await session.write.writeValueWithResponse(bytes.slice(offset, offset + 20));
    }
    return waitForResult(async () => {
      const current = await readBluetooth(session);
      return current.id === id ? current : null;
    }, signal);
  }

  function scan() {
    run("Memindai Wi-Fi…", async (signal) => {
      const result = await command({ action: "scan" }, signal);
      signal.throwIfAborted();
      if (result.status !== "scanned") throw new Error("ESP gagal memindai jaringan.");
      setNetworks(result.networks ?? []);
      if (!result.networks?.length) setMessage("Belum ada jaringan yang terlihat. Nama Wi-Fi juga bisa diisi manual.");
    });
  }

  function connect(event) {
    event.preventDefault();
    run("Menunggu ESP tersambung…", async (signal) => {
      const submitted = { action: "connect", ssid, password };
      setPassword("");
      const result = await command(submitted, signal);
      signal.throwIfAborted();
      if (result.status !== "connected") throw new Error("ESP gagal menghubungi TANDAIN lewat Wi-Fi baru. ESP mencoba kembali ke jaringan sebelumnya.");
      setMessage(`Perangkat sudah online lewat Wi-Fi ${ssid}.`);
      onChanged();
    });
  }

  const ready = mode === "remote" ? device?.wifi_configurable : Boolean(pairedTag);

  return (
    <dialog ref={dialog} aria-labelledby="wifi-setup-title" onCancel={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl bg-white p-5 text-ink shadow-xl backdrop:bg-black/45">
      <div className="flex items-center justify-between gap-3">
        <h2 id="wifi-setup-title" className="text-lg font-bold">Atur Wi-Fi {device?.tag_id ?? pairedTag}</h2>
        <button type="button" aria-label="Tutup" className="rounded p-1 hover:bg-page" onClick={onClose}><X size={20} /></button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {device?.online && (
          <button type="button" aria-pressed={mode === "remote"} disabled={Boolean(busy)}
            className={`${secondaryClass} ${mode === "remote" ? "border-brand text-brand" : ""}`}
            onClick={() => { setMode("remote"); setNetworks([]); setError(""); setMessage(""); }}>
            <Wifi size={16} /> Lewat internet
          </button>
        )}
        <button type="button" aria-pressed={mode === "bluetooth"} disabled={Boolean(busy)}
          className={`${secondaryClass} ${mode === "bluetooth" ? "border-brand text-brand" : ""}`}
          onClick={() => { setMode("bluetooth"); setNetworks([]); setError(""); setMessage(""); }}>
          <Bluetooth size={16} /> Lewat Bluetooth
        </button>
      </div>
      {mode === "bluetooth" && !pairedTag && (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-muted">Dekatkan HP atau laptop ke ESP yang offline dan aktifkan Bluetooth.</p>
          <button type="button" className={secondaryClass} disabled={Boolean(busy)}
            onClick={() => run("Menyambungkan Bluetooth…", pairBluetooth)}>Pilih perangkat Bluetooth</button>
        </div>
      )}
      {mode === "remote" && !ready && <p className="mt-4 text-sm text-muted">Perangkat perlu firmware yang mendukung pengaturan Wi-Fi dari dashboard.</p>}
      {ready && (
        <form onSubmit={connect} className="mt-4 space-y-3">
          <button type="button" className={secondaryClass} onClick={scan} disabled={Boolean(busy)}>Pindai Wi-Fi di sekitar ESP</button>
          {networks.length > 0 && (
            <select aria-label="Jaringan hasil pindai ESP" className={fieldClass} value={networks.some((n) => n.ssid === ssid) ? ssid : ""}
              disabled={Boolean(busy)} onChange={(event) => setSsid(event.target.value)}>
              <option value="">Pilih hasil pindai</option>
              {networks.map((network) => <option key={network.ssid} value={network.ssid}>{network.ssid}{network.secure ? "" : " (terbuka)"}</option>)}
            </select>
          )}
          <label className="block space-y-1 text-sm font-medium">Nama Wi-Fi
            <input className={fieldClass} required maxLength={32} value={ssid} disabled={Boolean(busy)} onChange={(event) => setSsid(event.target.value)} />
          </label>
          <label className="block space-y-1 text-sm font-medium">Password Wi-Fi
            <input className={fieldClass} type="password" autoComplete="new-password" maxLength={64} value={password}
              disabled={Boolean(busy)} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button type="submit" disabled={Boolean(busy)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Sambungkan ESP</button>
        </form>
      )}
      {(busy || message) && <p role="status" className="mt-3 text-sm text-muted">{busy || message}</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-triase-merah-soft p-2 text-sm text-triase-merah">{error}</p>}
    </dialog>
  );
}
