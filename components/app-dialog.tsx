"use client";

import { AlertTriangle, Check, X } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { useDialogStore } from "@/lib/dialog-store";

export function AppDialog({ locale }: { locale: Locale }) {
  const dialog = useDialogStore((state) => state.dialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  if (!dialog) return null;
  const confirm = dialog.kind === "confirm";
  return (
    <div className="modal-backdrop app-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeDialog(false)}>
      <section className="app-dialog" role="alertdialog" aria-modal="true">
        <span className={confirm ? "dialog-symbol danger" : "dialog-symbol"}>{confirm ? <AlertTriangle size={22} /> : <Check size={22} />}</span>
        <div><h2>{confirm ? (locale === "tr" ? "Emin misin?" : "Are you sure?") : "Miras"}</h2><p>{dialog.message}</p></div>
        <footer>
          {confirm && <button type="button" className="dialog-cancel" onClick={() => closeDialog(false)}><X size={16} />{locale === "tr" ? "Vazgeç" : "Cancel"}</button>}
          <button type="button" className={confirm ? "dialog-confirm danger" : "dialog-confirm"} onClick={() => closeDialog(true)}><Check size={16} />{confirm ? (locale === "tr" ? "Sil" : "Delete") : "OK"}</button>
        </footer>
      </section>
    </div>
  );
}
