import {
  nativeToScVal,
  scValToNative,
  xdr,
  Address,
} from "@stellar/stellar-sdk";

export const RPC_URL = "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const NETWORK = "testnet";

// Convert Stellar address (G...) to ScVal
export function toScValAddress(addr: string): xdr.ScVal {
  return new Address(addr).toScVal();
}

// Convert string to ScVal
export function toScValString(val: string): xdr.ScVal {
  return nativeToScVal(val, { type: "string" });
}

// Convert u32 to ScVal
export function toScValU32(val: number): xdr.ScVal {
  return nativeToScVal(val, { type: "u32" });
}

// Convert u64 (as bigint) to ScVal
export function toScValU64(val: bigint): xdr.ScVal {
  return nativeToScVal(val, { type: "u64" });
}

// Convert i128 (as bigint) to ScVal
export function toScValI128(val: bigint): xdr.ScVal {
  return nativeToScVal(val, { type: "i128" });
}

// Convert bool to ScVal
export function toScValBool(val: boolean): xdr.ScVal {
  return nativeToScVal(val);
}

// Convert ScVal to native JS value
export function fromScVal(val: xdr.ScVal): any {
  return scValToNative(val);
}

// XLM stroop conversion
export const STROOPS_PER_XLM = 10_000_000n;

export function xlmToStroops(xlm: number): bigint {
  return BigInt(Math.floor(xlm * 10_000_000));
}

export function stroopsToXlm(stroops: bigint): number {
  return Number(stroops) / 10_000_000;
}

// Format address for display
export function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr || "";
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

// Format XLM amount
export function formatXlm(stroops: bigint | number): string {
  const xlm =
    typeof stroops === "bigint"
      ? Number(stroops) / 10_000_000
      : stroops / 10_000_000;
  return xlm.toFixed(2);
}

// Parse interval in seconds to human readable
export function formatInterval(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  if (days >= 30) return `${Math.floor(days / 30)} month(s)`;
  if (days >= 7) return `${Math.floor(days / 7)} week(s)`;
  return `${days} day(s)`;
}

// Time constants
export const ONE_DAY = 86400;
export const ONE_WEEK = 604800;
export const ONE_MONTH = 2592000;
