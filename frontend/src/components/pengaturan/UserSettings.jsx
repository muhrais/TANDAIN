import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import Modal, { BTN_PRIMARY, BTN_ROW, INPUT, LABEL, BTN_DIALOG_PRIMARY, BTN_DIALOG_SECONDARY } from "../common/Modal";
import { createUser, updateUser } from "../../services/userService";
import { ApiClientError } from "../../lib/apiClient";
import { getCurrentUser } from "../../services/authService";

const ROLE_OPTIONS = [
  { value: "koordinator", label: "Koordinator" },
  { value: "petugas_pos_medis", label: "Petugas Pos Medis" },
  { value: "tenaga_medis_lapangan", label: "Tenaga Medis Lapangan" },
];
const ROLE_LABEL = Object.fromEntries(ROLE_OPTIONS.map((o) => [o.value, o.label]));
const ROLE_ACCESS = {
  koordinator: "Semua menu, termasuk Pengaturan",
  petugas_pos_medis: "Scan NFC, Evakuasi, Data Pasien",
  tenaga_medis_lapangan: "Scan NFC, Evakuasi, Data Pasien, catat korban jiwa",
};

const ROW_GRID = "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.6fr)_10.5rem]";

function errorText(err) {
  if (err instanceof ApiClientError) return err.details?.map((d) => d.message).join(" ") || err.message;
  return "Gagal terhubung ke server.";
}

function UserDialog({ user, onClose, onSaved }) {
  const isNew = !user;
  const isSelf = user?.user_id === getCurrentUser()?.user_id;
  const [form, setForm] = useState({
    nama: user?.nama ?? "",
    username: user?.username ?? "",
    role: user?.role ?? "petugas_pos_medis",
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (isNew && form.password.length < 6) return setError("Password minimal 6 karakter.");
    if (!isNew && form.password && form.password.length < 6) return setError("Password baru minimal 6 karakter.");
    setSaving(true);
    try {
      if (isNew) {
        await createUser(form);
      } else {
        await updateUser(user.user_id, {
          nama: form.nama,
          ...(isSelf ? {} : { role: form.role }),
          ...(form.password ? { password: form.password } : {}),
        });
      }
      onSaved();
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isNew ? "Tambah Pengguna" : `Ubah ${user.username}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={BTN_DIALOG_SECONDARY}>
            Batal
          </button>
          <button type="submit" form="user-form" disabled={saving} className={BTN_DIALOG_PRIMARY}>
            {saving ? "Menyimpan..." : isNew ? "Tambah pengguna" : "Simpan perubahan"}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className={LABEL}>Nama</span>
          <input type="text" value={form.nama} onChange={set("nama")} required maxLength={80} autoFocus className={INPUT} />
        </label>
        <label className="block">
          <span className={LABEL}>Username</span>
          <input
            type="text"
            value={form.username}
            onChange={set("username")}
            required
            disabled={!isNew}
            autoComplete="off"
            pattern="[a-zA-Z0-9._\-]{3,32}"
            title="3-32 karakter: huruf, angka, titik, garis bawah, atau strip"
            className={INPUT}
          />
          {!isNew && <span className="mt-1 block text-xs text-muted">Username tidak bisa diubah.</span>}
        </label>
        <label className="block">
          <span className={LABEL}>Role</span>
          <select value={form.role} onChange={set("role")} disabled={isSelf} className={INPUT}>
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-muted">
            {isSelf ? "Role akun sendiri tidak bisa diubah." : `Akses: ${ROLE_ACCESS[form.role]}.`}
          </span>
        </label>
        <label className="block">
          <span className={LABEL}>{isNew ? "Password" : "Password baru (kosongkan bila tidak diganti)"}</span>
          <input
            type="password"
            value={form.password}
            onChange={set("password")}
            required={isNew}
            minLength={isNew ? 6 : undefined}
            autoComplete="new-password"
            className={INPUT}
          />
        </label>
        {error && (
          <p role="alert" className="rounded-lg bg-triase-merah-soft px-3 py-2 text-sm text-triase-merah">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

// Tab Pengguna: daftar akun, tambah, ganti nama/role, reset password.
export default function UserSettings({ users, onSaved }) {
  const [dialog, setDialog] = useState(null); // null | "baru" | user
  const me = getCurrentUser();

  return (
    <div className="rounded-xl bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 md:px-5 md:pt-5">
        <div>
          <h2 className="font-semibold text-ink">Pengguna</h2>
          <p className="text-sm text-muted">Akun petugas yang dapat masuk ke TANDAIN. Paling sedikit satu akun harus berperan sebagai koordinator.</p>
        </div>
        <button type="button" onClick={() => setDialog("baru")} className={BTN_PRIMARY}>
          <Plus size={14} />
          Tambah pengguna
        </button>
      </div>
      <ul className="divide-y divide-black/5">
        <li aria-hidden="true" className={`hidden gap-4 px-5 py-2.5 text-xs font-medium text-muted lg:grid ${ROW_GRID}`}>
          <span>Nama</span>
          <span>Role</span>
          <span>Akses</span>
          <span className="text-right">Aksi</span>
        </li>
        {users.map((u) => (
          <li key={u.user_id} className={`grid grid-cols-1 gap-2 px-4 py-4 lg:items-center lg:gap-4 lg:px-5 ${ROW_GRID}`}>
            <div className="min-w-0 text-[13px]">
              <div className="truncate font-semibold text-ink">
                {u.nama}
                {u.user_id === me?.user_id && <span className="ml-2 rounded bg-page px-1.5 py-0.5 text-[11px] font-medium text-muted">Anda</span>}
              </div>
              <div className="truncate font-mono text-muted">{u.username}</div>
            </div>
            <div className="text-[13px] font-semibold text-ink">{ROLE_LABEL[u.role] ?? u.role}</div>
            <div className="text-[13px] text-muted">{ROLE_ACCESS[u.role]}</div>
            <div className="flex lg:justify-end">
              <button type="button" onClick={() => setDialog(u)} className={BTN_ROW}>
                <Pencil size={14} />
                Ubah / reset sandi
              </button>
            </div>
          </li>
        ))}
      </ul>
      {dialog && (
        <UserDialog
          user={dialog === "baru" ? null : dialog}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            onSaved();
          }}
        />
      )}
    </div>
  );
}
