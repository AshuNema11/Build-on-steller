"use client";

import { useState, useEffect, useCallback } from "react";

declare global {
  interface Window {
    freighter?: {
      isConnected: () => Promise<{ isConnected: boolean }>;
      isAllowed: () => Promise<{ isAllowed: boolean }>;
      requestAccess: () => Promise<string>;
      getAddress: () => Promise<{ address: string }>;
      signTransaction: (
        xdr: string,
        opts: { networkPassphrase: string }
      ) => Promise<{ signedTxXdr: string }>;
    };
  }
}

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
  });
  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      if (typeof window === "undefined" || !window.freighter) {
        setWallet({ address: null, isConnected: false, isConnecting: false });
        return;
      }
      const { isConnected } = await window.freighter.isConnected();
      if (isConnected) {
        const { address } = await window.freighter.getAddress();
        setWallet({ address, isConnected: true, isConnecting: false });
      } else {
        setWallet({ address: null, isConnected: false, isConnecting: false });
      }
    } catch {
      setWallet({ address: null, isConnected: false, isConnecting: false });
    }
  }, []);

  useEffect(() => {
    // Small delay to ensure freighter is injected
    const timer = setTimeout(() => checkConnection(), 500);
    return () => clearTimeout(timer);
  }, [checkConnection]);

  const connect = useCallback(async () => {
    setError(null);
    setWallet((prev) => ({ ...prev, isConnecting: true }));
    try {
      if (typeof window === "undefined" || !window.freighter) {
        throw new Error(
          "Freighter wallet not found. Please install the Freighter browser extension."
        );
      }

      const { isAllowed } = await window.freighter.isAllowed();
      if (!isAllowed) {
        await window.freighter.requestAccess();
      }

      const { address } = await window.freighter.getAddress();
      setWallet({ address, isConnected: true, isConnecting: false });
      return address;
    } catch (err: any) {
      setError(err?.message || "Failed to connect wallet");
      setWallet({ address: null, isConnected: false, isConnecting: false });
      return null;
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet({ address: null, isConnected: false, isConnecting: false });
    setError(null);
  }, []);

  return {
    ...wallet,
    error,
    connect,
    disconnect,
    checkConnection,
  };
}
