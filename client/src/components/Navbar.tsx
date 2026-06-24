"use client";

import { WalletState } from "@/hooks/wallet";
import { truncateAddress } from "@/lib/utils";

interface NavbarProps {
  wallet: WalletState;
  onConnect: () => void;
  onDisconnect: () => void;
  isConnecting: boolean;
}

export default function Navbar({
  wallet,
  onConnect,
  onDisconnect,
  isConnecting,
}: NavbarProps) {
  return (
    <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg">
            <span className="text-lg font-bold text-white">₿</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-white">
              PocketAllowance
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Decentralized Allowance Manager
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {wallet.isConnected && wallet.address ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-sm dark:bg-green-900/20">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                <span className="font-mono text-green-700 dark:text-green-400">
                  {truncateAddress(wallet.address)}
                </span>
              </div>
              <button
                onClick={onDisconnect}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition-all hover:scale-105 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-orange-900/30"
            >
              {isConnecting ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
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
                  Connecting...
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  Connect Freighter
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
