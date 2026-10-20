"use client";

import { useState } from "react";
import { findBank, type Bank } from "@/lib/banks";

/** Banka logosu; logo dosyası yoksa banka renginde kısaltma gösterir. */
export function BankLogo({ bank, size = 28 }: { bank: Bank | string | null | undefined; size?: number }) {
  const b = typeof bank === "string" || !bank ? findBank(bank) : bank;
  const [failed, setFailed] = useState(false);

  if (!b) {
    if (typeof bank !== "string" || !bank) return null;
    // Listede olmayan, elle yazılmış banka: baş harfi.
    return (
      <span className="grid shrink-0 place-items-center rounded-[28%] bg-surface-2 font-bold text-muted"
        style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden>
        {bank.trim().charAt(0).toLocaleUpperCase("tr-TR")}
      </span>
    );
  }

  if (failed) {
    return (
      <span className="grid shrink-0 place-items-center rounded-[28%] font-bold leading-none text-white"
        style={{ width: size, height: size, background: b.color, fontSize: size * (b.code.length > 3 ? 0.28 : b.code.length > 2 ? 0.33 : 0.4) }}
        aria-hidden>
        {b.code}
      </span>
    );
  }

  return (
    // Logolar yerel dosyadır; optimizasyon gerekmediği için düz img kullanılır.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/banks/${b.slug}.png`} alt="" width={size} height={size} onError={() => setFailed(true)}
      // Sunucuda render edilen resim, React bağlanmadan önce hata vermiş olabilir; bağlanınca kontrol et.
      ref={(img) => { if (img?.complete && img.naturalWidth === 0) setFailed(true); }}
      className="shrink-0 rounded-[28%] border border-line bg-white object-contain"
      style={{ width: size, height: size }} />
  );
}
