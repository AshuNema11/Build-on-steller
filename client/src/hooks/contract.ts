"use client";

import {
  rpc,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  BASE_FEE,
  Networks,
  xdr,
  Address,
  Account,
} from "@stellar/stellar-sdk";
import { RPC_URL, NETWORK_PASSPHRASE } from "@/lib/utils";

// The contract address (set after deployment)
export let CONTRACT_ADDRESS = "";

export function setContractAddress(addr: string) {
  CONTRACT_ADDRESS = addr;
}

let server: rpc.Server | null = null;

function getServer(): rpc.Server {
  if (!server) {
    server = new rpc.Server(RPC_URL);
  }
  return server;
}

function getContract(): Contract {
  if (!CONTRACT_ADDRESS) {
    throw new Error("Contract address not set");
  }
  return new Contract(CONTRACT_ADDRESS);
}

// ---- ScVal Converters ----
export function toScValString(val: string): xdr.ScVal {
  return nativeToScVal(val, { type: "string" });
}

export function toScValU32(val: number): xdr.ScVal {
  return nativeToScVal(val, { type: "u32" });
}

export function toScValI128(val: bigint): xdr.ScVal {
  return nativeToScVal(val, { type: "i128" });
}

export function toScValAddress(val: string): xdr.ScVal {
  return new Address(val).toScVal();
}

export function toScValBool(val: boolean): xdr.ScVal {
  return nativeToScVal(val);
}

export function toScValU64(val: bigint): xdr.ScVal {
  return nativeToScVal(val, { type: "u64" });
}

export function fromScVal(val: xdr.ScVal): any {
  return scValToNative(val);
}

// ---- Core Contract Interaction Functions ----

export async function readContract(
  method: string,
  params: xdr.ScVal[],
  source?: string
): Promise<any> {
  const contract = getContract();
  const srp = getServer();

  const operation = contract.call(method, ...params);
  
  const account = source
    ? await srp.getAccount(source)
    : new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const sim = await srp.simulateTransaction(tx);
  
  if ("error" in sim && sim.error) {
    throw new Error(sim.error);
  }
  
  if ("result" in sim && sim.result?.retval) {
    return scValToNative(sim.result.retval);
  }
  
  throw new Error("Unknown error during simulation");
}

export async function callContract(
  method: string,
  params: xdr.ScVal[],
  source: string,
  signAndSend: boolean = true
): Promise<string> {
  const contract = getContract();
  const srp = getServer();

  const account = await srp.getAccount(source);

  const operation = contract.call(method, ...params);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const sim = await srp.simulateTransaction(tx);

  if (!sim) {
    throw new Error("Transaction simulation failed");
  }

  // If user wants to sign and send
  if (signAndSend) {
    if (!window.freighter) {
      throw new Error("Freighter not found");
    }

    const { signedTxXdr } = await window.freighter.signTransaction(
      tx.toXDR(),
      { networkPassphrase: NETWORK_PASSPHRASE }
    );

    const signedTx = TransactionBuilder.fromXDR(
      signedTxXdr,
      NETWORK_PASSPHRASE
    );

    const sendResult = await srp.sendTransaction(signedTx);
    
    if (sendResult.status === "PENDING" || sendResult.status === "DUPLICATE") {
      // Poll for result
      let result = await srp.getTransaction(sendResult.hash);
      let attempts = 0;
      while (result.status === "NOT_FOUND" && attempts < 30) {
        await new Promise((r) => setTimeout(r, 1000));
        result = await srp.getTransaction(sendResult.hash);
        attempts++;
      }
      
      if (result.status === "SUCCESS") {
        return sendResult.hash;
      } else {
        const errorInfo = "resultXdr" in result ? result.resultXdr : "Unknown error";
        throw new Error(`Transaction failed: ${errorInfo}`);
      }
    } else {
      const errMsg = sendResult.errorResult ? sendResult.errorResult.toString() : "Unknown error";
      throw new Error(`Transaction submission failed: ${errMsg}`);
    }
  }

  // Just assemble and return the XDR for manual signing
  const assembledTx = rpc.assembleTransaction(tx, sim).build();
  return assembledTx.toXDR();
}

// ---- Allowance-specific Functions ----

export type Allowance = {
  parent: string;
  child: string;
  token: string;
  amount: bigint;
  interval: number;
  last_release: bigint;
  next_release: bigint;
  balance: bigint;
  active: boolean;
  created_at: bigint;
};

export type ReleaseRecord = {
  amount: bigint;
  timestamp: bigint;
};

// Create a new allowance
export async function createAllowance(
  parent: string,
  child: string,
  token: string,
  amount: bigint,
  interval: number
): Promise<string> {
  return callContract(
    "create",
    [
      toScValAddress(parent),
      toScValAddress(child),
      toScValAddress(token),
      toScValI128(amount),
      toScValU32(interval),
    ],
    parent,
    true
  );
}

// Fund an allowance
export async function fundAllowance(
  from: string,
  allowanceId: number,
  amount: bigint
): Promise<string> {
  return callContract(
    "fund",
    [
      toScValAddress(from),
      toScValU32(allowanceId),
      toScValI128(amount),
    ],
    from,
    true
  );
}

// Release payment (anyone can trigger the keeper function)
export async function releasePayment(
  source: string,
  allowanceId: number
): Promise<string> {
  return callContract(
    "release",
    [toScValU32(allowanceId)],
    source,
    true
  );
}

// Cancel an allowance
export async function cancelAllowance(
  parent: string,
  allowanceId: number
): Promise<string> {
  return callContract(
    "cancel",
    [
      toScValAddress(parent),
      toScValU32(allowanceId),
    ],
    parent,
    true
  );
}

// Get allowance details
export async function getAllowance(
  allowanceId: number
): Promise<Allowance> {
  const result = await readContract("get_allowance", [toScValU32(allowanceId)]);
  return {
    parent: result.parent,
    child: result.child,
    token: result.token,
    amount: result.amount,
    interval: result.interval,
    last_release: result.last_release,
    next_release: result.next_release,
    balance: result.balance,
    active: result.active,
    created_at: result.created_at,
  };
}

// Get all allowance IDs for a parent
export async function getParentAllowances(
  parent: string
): Promise<number[]> {
  const result = await readContract("get_parent_allowances", [
    toScValAddress(parent),
  ]);
  return result.map((id: number) => id);
}

// Get all allowance IDs for a child
export async function getChildAllowances(
  child: string
): Promise<number[]> {
  const result = await readContract("get_child_allowances", [
    toScValAddress(child),
  ]);
  return result.map((id: number) => id);
}

// Get release history for an allowance
export async function getReleaseHistory(
  allowanceId: number
): Promise<ReleaseRecord[]> {
  const result = await readContract("get_release_history", [
    toScValU32(allowanceId),
  ]);
  return result.map((record: any) => ({
    amount: record.amount,
    timestamp: record.timestamp,
  }));
}

// Get full allowance details with history
export async function getAllowanceWithHistory(
  allowanceId: number
): Promise<{ allowance: Allowance; history: ReleaseRecord[] }> {
  const [allowance, history] = await Promise.all([
    getAllowance(allowanceId),
    getReleaseHistory(allowanceId),
  ]);
  return { allowance, history };
}

// Get all allowances for a parent with history
export async function getParentDashboard(
  parent: string
): Promise<{ id: number; allowance: Allowance; history: ReleaseRecord[] }[]> {
  const ids = await getParentAllowances(parent);
  const results = await Promise.all(
    ids.map(async (id) => {
      const { allowance, history } = await getAllowanceWithHistory(id);
      return { id, allowance, history };
    })
  );
  return results;
}
