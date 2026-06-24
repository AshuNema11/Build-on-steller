"use client";

import { Allowance } from "@/hooks/contract";
import { truncateAddress, formatXlm, formatInterval, stroopsToXlm } from "@/lib/utils";
import { useMemo } from "react";

interface AllowanceCardProps {
  id: number;
  allowance: Allowance;
  onFund: (id: number) => void;
  onRelease: (id: number) => void;
  onCancel: (id: number) => void;
  isParent: boolean;
  userAddress: string;
}

export default function AllowanceCard({
  id,
  allowance,
  onFund,
  onRelease,
  onCancel,
  isParent,
  userAddress,
}: AllowanceCardProps) {
  const now = Math.floor(Date.now() / 1000);
  const isReleaseReady = allowance.active && now >= Number(allowance.next_release);
  const hasBalance = allowance.balance >= allowance.amount;

  const timeUntilNext = useMemo(() => {
    if (!allowance.active) return "Cancelled";
    const diff = Number(allowance.next_release) - now;
    if (diff <= 0) return "Ready!";
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  }, [allowance, now]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-zinc-900 dark:text-white">
              Allowance #{id}
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                allowance.active
                  ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
              }`}
            >
              {allowance.active ? "Active" : "Cancelled"}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Child</span>
              <p className="font-mono text-zinc-900 dark:text-white">
                {truncateAddress(allowance.child)}
              </p>
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Amount</span>
              <p className="font-semibold text-zinc-900 dark:text-white">
                {formatXlm(allowance.amount)} XLM / {formatInterval(allowance.interval)}
              </p>
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Balance</span>
              <p className="font-mono text-zinc-900 dark:text-white">
                {formatXlm(allowance.balance)} XLM
              </p>
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Next Release</span>
              <p
                className={`font-mono ${
                  isReleaseReady && allowance.active
                    ? "font-semibold text-green-600 dark:text-green-400"
                    : "text-zinc-900 dark:text-white"
                }`}
              >
                {timeUntilNext}
              </p>
            </div>
          </div>
        </div>
      </div>

      {allowance.active && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          {isParent && (
            <>
              <button
                onClick={() => onFund(id)}
                className="rounded-lg bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:scale-105"
              >
                Fund
              </button>
              <button
                onClick={() => onCancel(id)}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Cancel
              </button>
            </>
          )}
          {(isReleaseReady && hasBalance) && (
            <button
              onClick={() => onRelease(id)}
              className="rounded-lg bg-gradient-to-r from-blue-400 to-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:scale-105"
            >
              Release Now
            </button>
          )}
          {isReleaseReady && !hasBalance && isParent && (
            <span className="rounded-lg bg-amber-50 px-4 py-2 text-sm font-medium text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
              Needs funding
            </span>
          )}
        </div>
      )}
    </div>
  );
}
