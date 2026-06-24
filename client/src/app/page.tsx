"use client";

import dynamic from "next/dynamic";

// Import dashboard dynamically to avoid SSR issues with Freighter
const DashboardView = dynamic(
  () => import("@/components/DashboardView"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent mx-auto"></div>
          <p className="text-zinc-500 dark:text-zinc-400">
            Loading PocketAllowance...
          </p>
        </div>
      </div>
    ),
  }
);

// Placeholder contract address — user must replace after deployment
const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2VM";

export default function Home() {
  return (
    <>
      {/* Replace NEXT_PUBLIC_CONTRACT_ADDRESS in .env with your deployed contract address (C...) */}
      <DashboardView contractAddress={CONTRACT_ADDRESS} />
    </>
  );
}
