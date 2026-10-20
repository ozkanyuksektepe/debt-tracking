"use client";

import { RefreshCw, ServerCrash } from "lucide-react";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-[24px] border border-line bg-surface p-8 text-center shadow-card">
      <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger">
        <ServerCrash className="size-7" />
      </span>
      <h2 className="text-lg font-semibold">Veriler yüklenemedi</h2>
      <p className="mt-1 text-[14px] text-muted">
        .NET backend&apos;in çalıştığından emin ol (<code>localhost:5080</code>). Proje klasöründeki <code>start.sh</code> ikisini birlikte başlatır.
      </p>
      {message && <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-[12.5px] text-muted">{message}</p>}
      <button type="button" className="btn-primary mt-5" onClick={() => retry()}>
        <RefreshCw className="size-4" /> Tekrar dene
      </button>
    </div>
  );
}
