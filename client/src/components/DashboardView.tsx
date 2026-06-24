"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/hooks/wallet";
import Navbar from "./Navbar";
import CreateAllowance from "./CreateAllowance";
import AllowanceCard from "./AllowanceCard";
import TransactionHistory from "./TransactionHistory";
import {
  getParentDashboard,
  fundAllowance,
  releasePayment,
  cancelAllowance,
  Allowance,
  ReleaseRecord,
} from "@/hooks/contract";
import {
  truncateAddress,
  stroopsToXlm,
  formatXlm,
} from "@/lib/utils";

// Default wrapped XLM token address on Stellar Testnet
const DEFAULT_TOKEN_ADDRESS =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

interface AllowanceData {
  id: number;
  allowance: Allowance;
  history: ReleaseRecord[];
}

export default function DashboardView({
  contractAddress,
}: {
  contractAddress: string;
}) {
  const wallet = useWallet();
  const [allowances, setAllowances] = useState<AllowanceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<{
    [key: string]: boolean;
  }>({});
  const [fundAmount, setFundAmount] = useState<{ [key: number]: string }>({});
  const [showFundModal, setShowFundModal] = useState<number | null>(null);

  const loadAllowances = useCallback(async () => {
    if (!wallet.address) return;
    setLoading(true);
    try {
      const data = await getParentDashboard(wallet.address);
      setAllowances(data);
    } catch (err) {
      console.error("Failed to load allowances:", err);
    } finally {
      setLoading(false);
    }
  }, [wallet.address]);

  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      loadAllowances();
    } else {
      setAllowances([]);
    }
  }, [wallet.isConnected, wallet.address, loadAllowances]);

  const handleCreate = () => {
    loadAllowances();
  };

  const handleFund = async (id: number) => {
    const amountStr = fundAmount[id];
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return;

    setActionLoading((prev) => ({ ...prev, [`fund-${id}`]: true }));
    try {
      await fundAllowance(
        wallet.address!,
        id,
        BigInt(Math.floor(amount * 10_000_000))
      );
      setFundAmount((prev) => ({ ...prev, [id]: "" }));
      setShowFundModal(null);
      await loadAllowances();
    } catch (err: any) {
      alert(`Failed to fund: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`fund-${id}`]: false }));
    }
  };

  const handleRelease = async (id: number) => {
    setActionLoading((prev) => ({ ...prev, [`release-${id}`]: true }));
    try {
      await releasePayment(wallet.address!, id);
      await loadAllowances();
    } catch (err: any) {
      alert(`Failed to release: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`release-${id}`]: false }));
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this allowance?")) return;
    setActionLoading((prev) => ({ ...prev, [`cancel-${id}`]: true }));
    try {
      await cancelAllowance(wallet.address!, id);
      await loadAllowances();
    } catch (err: any) {
      alert(`Failed to cancel: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`cancel-${id}`]: false }));
    }
  };

  // Stats
  const activeAllowances = allowances.filter((a) => a.allowance.active);
  const totalBalance = activeAllowances.reduce(
    (sum, a) => sum + Number(a.allowance.balance),
    0
  );
  const totalMonthly = activeAllowances.reduce(
    (sum, a) => sum + Number(a.allowance.amount),
    0
  );
  const totalReleases = allowances.reduce(
    (sum, a) => sum + a.history.length,
    0
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar
        wallet={{
          address: wallet.address,
          isConnected: wallet.isConnected,
          isConnecting: wallet.isConnecting,
        }}
        onConnect={wallet.connect}
        onDisconnect={wallet.disconnect}
        isConnecting={wallet.isConnecting}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {!wallet.isConnected ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-xl">
              <span className="text-3xl font-bold text-white">₿</span>
            </div>
            <h2 className="mb-2 text-3xl font-bold text-zinc-900 dark:text-white">
              Welcome to PocketAllowance
            </h2>
            <p className="mb-8 max-w-md text-center text-zinc-500 dark:text-zinc-400">
              Connect your Freighter wallet to manage decentralized allowances
              for your family on the Stellar network.
            </p>
            <button
              onClick={wallet.connect}
              disabled={wallet.isConnecting}
              className="rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-8 py-3 text-lg font-semibold text-white shadow-xl shadow-orange-200 transition-all hover:scale-105 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-orange-900/30"
            >
              {wallet.isConnecting ? "Connecting..." : "Connect Freighter Wallet"}
            </button>
            {wallet.error && (
              <p className="mt-4 text-sm text-red-500">{wallet.error}</p>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Active
                </p>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                  {activeAllowances.length}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Balance
                </p>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                  {formatXlm(totalBalance)} XLM
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Monthly Total
                </p>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                  {formatXlm(totalMonthly)} XLM
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Releases
                </p>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                  {totalReleases}
                </p>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
              {/* Left: Create Allowance */}
              <div className="lg:col-span-1">
                <CreateAllowance
                  parentAddress={wallet.address!}
                  tokenAddress={DEFAULT_TOKEN_ADDRESS}
                  onCreated={handleCreate}
                />
              </div>

              {/* Middle: Allowance Cards */}
              <div className="space-y-4 lg:col-span-2">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Your Allowances
                </h2>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <svg
                      className="h-8 w-8 animate-spin text-yellow-400"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  </div>
                ) : allowances.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
                    <p className="text-zinc-500 dark:text-zinc-400">
                      No allowances yet. Create your first one!
                    </p>
                  </div>
                ) : (
                  allowances.map((data) => (
                    <AllowanceCard
                      key={data.id}
                      id={data.id}
                      allowance={data.allowance}
                      onFund={(id) => setShowFundModal(id)}
                      onRelease={handleRelease}
                      onCancel={handleCancel}
                      isParent={true}
                      userAddress={wallet.address!}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Transaction History */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Transaction History
              </h2>
              <TransactionHistory
                history={allowances.map((a) => ({
                  id: a.id,
                  child: a.allowance.child,
                  records: a.history,
                }))}
              />
            </div>

            {/* Fund Modal */}
            {showFundModal !== null && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                  <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                    Fund Allowance #{showFundModal}
                  </h3>
                  <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                    Enter the amount of XLM to deposit into this allowance.
                  </p>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="Amount in XLM"
                    value={fundAmount[showFundModal] || ""}
                    onChange={(e) =>
                      setFundAmount((prev) => ({
                        ...prev,
                        [showFundModal]: e.target.value,
                      }))
                    }
                    className="mb-4 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 transition-colors focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowFundModal(null)}
                      className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleFund(showFundModal)}
                      disabled={actionLoading[`fund-${showFundModal}`]}
                      className="flex-1 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:scale-105 disabled:opacity-50"
                    >
                      {actionLoading[`fund-${showFundModal}`]
                        ? "Funding..."
                        : "Deposit"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
