"use client";

import { useState } from "react";
import { createAllowance } from "@/hooks/contract";
import { xlmToStroops, ONE_MONTH } from "@/lib/utils";

interface CreateAllowanceProps {
  parentAddress: string;
  tokenAddress: string;
  onCreated: () => void;
}

export default function CreateAllowance({
  parentAddress,
  tokenAddress,
  onCreated,
}: CreateAllowanceProps) {
  const [childAddress, setChildAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [intervalType, setIntervalType] = useState<"monthly" | "weekly" | "daily">("monthly");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getIntervalSeconds = () => {
    switch (intervalType) {
      case "weekly": return 604800;
      case "daily": return 86400;
      default: return ONE_MONTH;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!childAddress || !childAddress.startsWith("G") || childAddress.length !== 56) {
      setError("Please enter a valid Stellar address (starts with G, 56 chars)");
      return;
    }

    const xlmAmount = parseFloat(amount);
    if (isNaN(xlmAmount) || xlmAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (!tokenAddress) {
      setError("Token address not configured");
      return;
    }

    setIsCreating(true);
    try {
      const stroops = xlmToStroops(xlmAmount);
      const interval = getIntervalSeconds();
      
      const txHash = await createAllowance(
        parentAddress,
        childAddress.trim(),
        tokenAddress,
        stroops,
        interval
      );

      setSuccess(`Allowance created! TX: ${txHash.slice(0, 10)}...`);
      setChildAddress("");
      setAmount("");
      onCreated();
    } catch (err: any) {
      setError(err?.message || "Failed to create allowance");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
        Create New Allowance
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Child&apos;s Stellar Address
          </label>
          <input
            type="text"
            placeholder="G..."
            value={childAddress}
            onChange={(e) => setChildAddress(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Amount (XLM)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              placeholder="10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Frequency
            </label>
            <select
              value={intervalType}
              onChange={(e) => setIntervalType(e.target.value as any)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 transition-colors focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={isCreating}
          className="w-full rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreating ? "Creating..." : "Create Allowance"}
        </button>
      </form>
    </div>
  );
}
