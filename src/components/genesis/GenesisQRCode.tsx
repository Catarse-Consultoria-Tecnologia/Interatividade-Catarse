"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function GenesisQRCode({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { margin: 1, width: 160, color: { dark: "#0d2137", light: "#ffffff" } })
      .then((d) => !cancelled && setDataUrl(d))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!dataUrl) {
    return <div className="h-[160px] w-[160px] animate-pulse rounded-lg bg-cinza-calido" />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt="QR Code da sala" width={160} height={160} className="rounded-lg border border-borda" />;
}
