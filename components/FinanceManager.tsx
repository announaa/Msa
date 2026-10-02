"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/lib/dictionaries";

type OpenInvoice = { id: string; periodLabel: string };

export function FinanceManager({
  studentId,
  monthlyFeeCents,
  openInvoices,
  dict,
}: {
  studentId: string;
  monthlyFeeCents: number | null;
  openInvoices: OpenInvoice[];
  dict: Dictionary;
}) {
  const router = useRouter();
  const [feeLoading, setFeeLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  async function saveFee(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeeLoading(true);
    const data = new FormData(e.currentTarget);
    const dollars = Number(data.get("fee"));
    await fetch(`/api/students/${studentId}/fee`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthlyFeeCents: Math.round(dollars * 100) }),
    });
    setFeeLoading(false);
    router.refresh();
  }

  async function createInvoice(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInvoiceLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    await fetch("/api/finance/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        periodLabel: data.get("periodLabel"),
        amountCents: Math.round(Number(data.get("amount")) * 100),
        dueDate: data.get("dueDate"),
      }),
    });
    setInvoiceLoading(false);
    form.reset();
    router.refresh();
  }

  async function recordPayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPaymentLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    const invoiceId = String(data.get("invoiceId") || "");
    await fetch("/api/finance/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        invoiceId: invoiceId || undefined,
        amountCents: Math.round(Number(data.get("amount")) * 100),
        method: data.get("method"),
        note: data.get("note") || undefined,
      }),
    });
    setPaymentLoading(false);
    form.reset();
    router.refresh();
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <form onSubmit={saveFee} className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold">{dict.finance.monthlyFee}</p>
        <div className="flex gap-2">
          <input
            name="fee"
            type="number"
            step="0.01"
            min="0"
            defaultValue={monthlyFeeCents != null ? (monthlyFeeCents / 100).toFixed(2) : ""}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
          <button
            disabled={feeLoading}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {dict.common.save}
          </button>
        </div>
      </form>

      <form onSubmit={createInvoice} className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold">{dict.finance.newInvoice}</p>
        <div className="space-y-2">
          <input
            name="periodLabel"
            required
            placeholder={dict.finance.period}
            defaultValue=""
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder={dict.finance.amount}
            defaultValue={monthlyFeeCents != null ? (monthlyFeeCents / 100).toFixed(2) : ""}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
          <input
            name="dueDate"
            type="date"
            required
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
          <button
            disabled={invoiceLoading}
            className="w-full rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {dict.finance.newInvoice}
          </button>
        </div>
      </form>

      <form onSubmit={recordPayment} className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold">{dict.finance.recordPayment}</p>
        <div className="space-y-2">
          <select name="invoiceId" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">{dict.finance.generalPayment}</option>
            {openInvoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.periodLabel}
              </option>
            ))}
          </select>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder={dict.finance.amount}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
          <select name="method" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            {Object.entries(dict.finance.method).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <input
            name="note"
            placeholder={dict.tasks.note}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
          <button
            disabled={paymentLoading}
            className="w-full rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {dict.finance.recordPayment}
          </button>
        </div>
      </form>
    </div>
  );
}
