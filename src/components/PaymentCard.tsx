"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { appConfig } from "@/lib/config";

export function PaymentCard({
  amount,
  note,
  title = "Pay the fee",
}: {
  amount: number;
  note: string;
  title?: string;
}) {
  const { upi, currencySymbol } = appConfig;
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upi.id)}&pn=${encodeURIComponent(
    upi.payeeName,
  )}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

  const [copied, setCopied] = useState(false);

  async function copyUpiId() {
    try {
      await navigator.clipboard.writeText(upi.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be unavailable (e.g. non-secure context) — ignore.
    }
  }

  return (
    <section className="rounded-2xl border border-amber-300/20 bg-gradient-to-b from-amber-400/10 to-transparent p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <div className="text-right">
          <div className="text-2xl font-bold leading-none text-white">
            {currencySymbol}
            {amount}
          </div>
          <div className="text-[11px] uppercase tracking-wide text-white/40">
            entry fee
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-stretch">
        <div className="shrink-0 rounded-2xl bg-[#ffffff] p-3 shadow-lg shadow-black/30">
          <QRCodeSVG value={upiUrl} size={168} level="M" marginSize={2} />
        </div>

        <div className="flex flex-1 flex-col justify-center gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-white/40">
              Pay to UPI ID
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-black/30 px-2 py-1 font-mono text-sm text-emerald-200">
                {upi.id}
              </code>
              <button
                type="button"
                onClick={copyUpiId}
                className="rounded-lg border border-white/10 px-2 py-1 text-xs text-white/70 transition hover:bg-white/10"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
          </div>

          <ol className="space-y-1.5 text-sm text-white/60">
            <li className="flex gap-2">
              <span className="text-amber-300">1.</span> Scan the QR with any UPI
              app (GPay, PhonePe, Paytm…)
            </li>
            <li className="flex gap-2">
              <span className="text-amber-300">2.</span> Pay {currencySymbol}
              {amount} and copy the reference / UTR number
            </li>
            <li className="flex gap-2">
              <span className="text-amber-300">3.</span> Paste it below to confirm
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}

