"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function RoomQRCode({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { margin: 1, width: 180, color: { dark: "#0a1526", light: "#fdfbf5" } })
      .then((d) => !cancelled && setDataUrl(d))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!dataUrl) {
    return <div className="h-[180px] w-[180px] animate-pulse rounded-lg bg-white/10" />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt="QR Code da sala" width={180} height={180} className="rounded-lg" />;
}
