import { useCallback, useEffect, useRef, useState } from "react";
import Modal, { BTN_DIALOG_PRIMARY, BTN_DIALOG_SECONDARY } from "./Modal";
import { ConfirmContext } from "../../lib/confirm";

// Satu dialog konfirmasi untuk seluruh aplikasi (lihat useConfirm di lib/confirm.js).
export default function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null); // { title, message, confirmLabel, cancelLabel, resolve }
  const confirmButtonRef = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        setRequest({ ...options, resolve });
      }),
    []
  );

  const close = useCallback(
    (result) => {
      request?.resolve(result);
      setRequest(null);
    },
    [request]
  );
  const cancel = useCallback(() => close(false), [close]);

  // Fokus ke tombol konfirmasi supaya Enter langsung menjawab "ya".
  useEffect(() => {
    if (request) confirmButtonRef.current?.focus();
  }, [request]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <Modal
          title={request.title ?? "Konfirmasi"}
          size="sm"
          onClose={cancel}
          footer={
            <>
              <button type="button" onClick={cancel} className={BTN_DIALOG_SECONDARY}>
                {request.cancelLabel ?? "Batal"}
              </button>
              <button type="button" ref={confirmButtonRef} onClick={() => close(true)} className={BTN_DIALOG_PRIMARY}>
                {request.confirmLabel ?? "Ya, lanjutkan"}
              </button>
            </>
          }
        >
          <p className="text-sm text-ink/80">{request.message}</p>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}
