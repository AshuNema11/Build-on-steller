"use client";

import { ReleaseRecord } from "@/hooks/contract";
import { formatXlm } from "@/lib/utils";

interface TransactionHistoryProps {
  history: { id: number; child: string; records: ReleaseRecord[] }[];
}

export default function TransactionHistory({
  history,
}: TransactionHistoryProps) {
  if (!history || history.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-500 dark:text-zinc-400">
          No transactions yet. Create an allowance to get started.
        </p>
      </div>
    );
  }

  // Flatten all records with allowance info
  const allRecords = history.flatMap((h) =>
    h.records.map((r) => ({
      ...r,
      allowanceId: h.id,
      child: h.child,
    }))
  ).sort((a, b) => Number(b.timestamp - a.timestamp));

  if (allRecords.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-500 dark:text-zinc-400">
          No releases yet. Fund and release an allowance.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
              <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                Date
              </th>
              <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                Allowance
              </th>
              <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                Amount
              </th>
              <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {allRecords.map((record, idx) => (
              <tr
                key={idx}
                className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
              >
                <td className="px-4 py-3 text-zinc-900 dark:text-white">
                  {new Date(
                    Number(record.timestamp) * 1000
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 font-mono text-zinc-900 dark:text-white">
                  #{record.allowanceId}
                </td>
                <td className="px-4 py-3 font-medium text-green-600 dark:text-green-400">
                  {formatXlm(record.amount)} XLM
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600 dark:bg-green-900/20 dark:text-green-400">
                    Released
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
