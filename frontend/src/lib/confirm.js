import { createContext, useContext } from "react";

export const ConfirmContext = createContext(null);

// Pengganti window.confirm dengan dialog bergaya TANDAIN:
//   const confirm = useConfirm();
//   if (!(await confirm({ title, message, confirmLabel }))) return;
// Hasil true bila dikonfirmasi, false bila dibatalkan (Batal, X, Escape, klik luar).
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm harus dipakai di dalam <ConfirmProvider>.");
  return confirm;
}
