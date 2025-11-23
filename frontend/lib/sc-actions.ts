import { arbitrum, base } from 'viem/chains';
import {
  http,
  type Address,
  type Abi,
  type Account,
  type Hash,
  type TransactionReceipt,
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
} from 'viem';

import { env } from '@/config/env';
import { OpenPaymasterAbi } from '@/lib/abi/openPaymasterAbi';

export type PoolInitializedLog = {
  token: Address;
  oracle: Address;
  lpFeeBps: number | undefined;
  rebalancingFeeBps: number | undefined;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
};

type WriteContractParams = {
  /** For logging/context (e.g. 'createPool', 'supplyToPool') */
  action: string;
  address: Address;
  abi: Abi;
  functionName: string;
  account: Account | Address | null;
  args?: readonly unknown[];
  value?: bigint;
};

type CreatePoolParams = {
  token: Address;
  oracle: Address;
  lpFeeBps: bigint;
  rebalancingFeeBps: bigint;
};

type SupplyPoolParams = {
  token: Address;
  assetsWei: bigint;
  receiver: Address;
};

type WithdrawPoolParams = {
  token: Address;
  assetsWei: bigint;
  receiver: Address;
  owner: Address;
};

type RebalancePoolParams = {
  token: Address;
  tokenAmount: bigint;
  maxEthToSend: bigint; // msg.value >= ethAmountAfterDiscount
  receiver: Address;
};

type TxResult = {
  hash: Hash;
  receipt: TransactionReceipt;
};

const chain = arbitrum;
const rpcUrl =
  chain.id === arbitrum.id
    ? 'https://virtual.arbitrum.eu.rpc.tenderly.co/e6fb815c-cd14-4c18-8353-69ee17162268 '
    : 'https://virtual.base.eu.rpc.tenderly.co/f346cd0c-38c5-43af-881d-26ef5805c88a';

export const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

export const walletClient = createWalletClient({
  chain,
  transport: http(rpcUrl),
});

export const [account] = await walletClient.getAddresses();

const paymasterAddress = env.paymasterAddress as Address;
const poolIdFromToken = (token: Address): bigint => BigInt(token);

/* -------------------------------------------------------------------------- */
/*                                   Logging                                  */
/* -------------------------------------------------------------------------- */

type TxMeta = {
  action: string;
  functionName: string;
  address: Address;
};

const logTxSubmitted = (
  meta: TxMeta,
  hash: Hash,
  args?: readonly unknown[],
) => {
  console.info('[paymaster] tx submitted', {
    action: meta.action,
    fn: meta.functionName,
    address: meta.address,
    hash,
    args,
    chainId: chain.id,
  });
};

const logTxConfirmed = (
  meta: TxMeta,
  hash: Hash,
  receipt: TransactionReceipt,
) => {
  console.info('[paymaster] tx confirmed', {
    action: meta.action,
    fn: meta.functionName,
    address: meta.address,
    hash,
    status: receipt.status,
    gasUsed: receipt.gasUsed?.toString(),
    blockNumber: receipt.blockNumber?.toString(),
  });
};

const logTxError = (
  meta: TxMeta,
  error: unknown,
  args?: readonly unknown[],
) => {
  // viem errors all extend BaseError
  if (error instanceof BaseError) {
    const revertError = error.walk(
      (err) => err instanceof ContractFunctionRevertedError,
    );

    if (revertError instanceof ContractFunctionRevertedError) {
      console.error('[paymaster] tx reverted', {
        action: meta.action,
        fn: meta.functionName,
        address: meta.address,
        args,
        shortMessage: error.shortMessage,
        errorName: revertError.data?.errorName,
        errorArgs: revertError.data?.args,
      });
    } else {
      console.error('[paymaster] tx failed', {
        action: meta.action,
        fn: meta.functionName,
        address: meta.address,
        args,
        shortMessage: error.shortMessage,
        details: error.details,
      });
    }
  } else {
    console.error('[paymaster] tx failed with non-viem error', {
      action: meta.action,
      fn: meta.functionName,
      address: meta.address,
      args,
      error,
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                             Write helper (viem)                            */
/* -------------------------------------------------------------------------- */

/**
 * Best-practice write helper:
 *  - simulateContract first (validates & estimates gas)
 *  - writeContract with request from simulation
 *  - waitForTransactionReceipt
 *  - structured logging/error handling
 */
const writeContract = async (
  params: WriteContractParams,
): Promise<TxResult> => {
  const { action, address, abi, functionName, account, args, value } = params;

  if (!account) {
    // Failing early here tends to be nicer for UI
    throw new Error(
      `[paymaster] writeContract called without account (${action})`,
    );
  }

  const meta: TxMeta = { action, functionName, address };

  try {
    // 1) simulate the call (recommended in viem docs)
    const { request } = await publicClient.simulateContract({
      address,
      abi,
      functionName,
      args,
      account,
      value,
    });

    // 2) broadcast tx
    const hash = await walletClient.writeContract(request);
    logTxSubmitted(meta, hash, args);

    // 3) wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    logTxConfirmed(meta, hash, receipt);

    return { hash, receipt };
  } catch (error) {
    logTxError(meta, error, args);
    throw error;
  }
};

/* -------------------------------------------------------------------------- */
/*                                  Actions                                   */
/* -------------------------------------------------------------------------- */

export async function createPool(params: CreatePoolParams) {
  const { token, oracle, lpFeeBps, rebalancingFeeBps } = params;

  return writeContract({
    action: 'createPool',
    address: paymasterAddress,
    abi: OpenPaymasterAbi,
    functionName: 'initializePool',
    args: [token, lpFeeBps, rebalancingFeeBps, oracle],
    account,
  });
}

export async function supplyToPool(params: SupplyPoolParams) {
  const { token, assetsWei, receiver } = params;

  const id = poolIdFromToken(token);

  return writeContract({
    action: 'supplyToPool',
    address: paymasterAddress,
    abi: OpenPaymasterAbi,
    functionName: 'deposit',
    args: [assetsWei, receiver, id],
    value: assetsWei, // MUST equal `assets` or it will revert
    account,
  });
}

export async function withdrawFromPool(params: WithdrawPoolParams) {
  const { token, assetsWei, receiver, owner } = params;

  const id = poolIdFromToken(token);

  return writeContract({
    action: 'withdrawFromPool',
    address: paymasterAddress,
    abi: OpenPaymasterAbi,
    functionName: 'withdraw',
    args: [assetsWei, receiver, owner, id],
    account,
  });
}

export async function rebalancePool(params: RebalancePoolParams) {
  const { token, tokenAmount, maxEthToSend, receiver } = params;

  return writeContract({
    action: 'rebalancePool',
    address: paymasterAddress,
    abi: OpenPaymasterAbi,
    functionName: 'rebalance',
    args: [token, tokenAmount, receiver],
    value: maxEthToSend,
    account,
  });
}

/* -------------------------------------------------------------------------- */
/*                                  Getter                                   */
/* -------------------------------------------------------------------------- */

export async function fetchPoolInitializedLogs(): Promise<
  PoolInitializedLog[]
> {
  const logs = await publicClient.getContractEvents({
    address: env.paymasterAddress as Address,
    abi: OpenPaymasterAbi,
    eventName: 'PoolInitialized',
    fromBlock: BigInt(0), // optionally replace with deployment block
  });

  return logs.map((log) => ({
    token: log.args.token as Address,
    oracle: log.args.oracle as Address,
    lpFeeBps: log.args.lpFeeBps,
    rebalancingFeeBps: log.args.rebalancingFeeBps,
    blockNumber: log.blockNumber!,
    transactionHash: log.transactionHash!,
    logIndex: log.logIndex!,
  }));
}
