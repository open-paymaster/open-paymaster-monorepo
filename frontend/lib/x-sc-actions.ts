import type { SmartAccount } from 'viem/account-abstraction';
import { AmbireMultiChainSmartAccount } from '@eil-protocol/accounts';
import { getClient, getBalance, readContract } from 'wagmi/actions';
import { getAccount, getWalletClient, reconnect } from '@wagmi/core';
import { erc20Abi, zeroAddress, type Address, type WalletClient } from 'viem';
import {
  CrossChainSdk,
  MultichainToken,
  AmbireBundlerManager,
  TransferAction,
  type ExecCallback,
  type IMultiChainSmartAccount,
} from '@eil-protocol/sdk';

import { chainIds, wagmiConfig } from '@/config/wagmi-config';

export interface CapturedFlagsData {
  flagHolder0: string;
  flagHolder1: string;
}

export interface BalanceData {
  balance0: bigint;
  balance1: bigint;
  balanceEth0: bigint;
  balanceEth1: bigint;
}

export const BALANCE_PLACEHOLDER: BalanceData = {
  balance0: BigInt(-1),
  balance1: BigInt(-1),
  balanceEth0: BigInt(-1),
  balanceEth1: BigInt(-1),
};

async function fetchWalletClient(): Promise<WalletClient | undefined> {
  // Ensure reconnection is triggered
  await reconnect(wagmiConfig);
  // Poll for connector readiness
  const maxAttempts = 5;
  const delay = 1000; // 1 second
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const account = getAccount(wagmiConfig);
    if (
      account.isConnected &&
      account.connector &&
      typeof account.connector.getChainId === 'function'
    ) {
      try {
        const walletClient = await getWalletClient(wagmiConfig, {
          connector: account.connector,
        });
        console.log('Wallet client:', walletClient);
        return walletClient;
      } catch (error) {
        console.error('Failed to get wallet client:', error);
        throw error;
      }
    }
    if (attempt === maxAttempts) {
      throw new Error('Connector not ready after maximum attempts');
    }
    console.log(
      `Attempt ${attempt}: Connector not ready, retrying in ${delay}ms...`
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return undefined;
}

export async function createEilSdk(): Promise<{
  sdk: CrossChainSdk;
  account: AmbireMultiChainSmartAccount;
}> {
  const walletClient: WalletClient | undefined = await fetchWalletClient();
  if (walletClient == null) {
    throw new Error('Wallet client is null');
  }

  const ambireBundlerManager = new AmbireBundlerManager(
    walletClient,
    new Map<bigint, Address>()
  );

  const walletAccount = getAccount(wagmiConfig)?.address ?? zeroAddress;
  const ambireAccount = new AmbireMultiChainSmartAccount(
    walletClient,
    walletAccount,
    [BigInt(chainIds[0]), BigInt(chainIds[1])],
    ambireBundlerManager
  );

  await ambireAccount.init();
  const crossChainSdk = new CrossChainSdk();

  return { sdk: crossChainSdk, account: ambireAccount };
}

export async function crossChainTransfer(
  sdk: CrossChainSdk,
  account: IMultiChainSmartAccount,
  recipient: Address,
  paymaster: Address,
  usdc: MultichainToken,
  amount: bigint,
  callback: ExecCallback
): Promise<void> {
  const [chainId0, chainId1] = chainIds;

  const useropOverride = {
    maxFeePerGas: BigInt(1000000000),
    maxPriorityFeePerGas: BigInt(10),
  };

  const paymasterOverride = {
    paymaster: paymaster ?? '0xc7F3D98ed15c483C0f666d9F3EA0Dc7abEe77ca2',
    paymasterVerificationGasLimit: BigInt(100_000),
    paymasterPostOpGasLimit: BigInt(0),
  };

  const executor = await sdk
    .createBuilder()
    .startBatch(chainId0)
    .addVoucherRequest({
      ref: 'voucher_request_1',
      destinationChainId: chainId1,
      tokens: [{ token: usdc, amount: amount }],
    })
    .overrideUserOp(useropOverride)
    .overrideUserOp(paymasterOverride)
    .endBatch()
    .startBatch(chainId1)
    .useAllVouchers()
    .addAction(
      new TransferAction({
        token: usdc,
        recipient,
        amount,
      })
    )
    .overrideUserOp(useropOverride)
    .endBatch()
    .useAccount(account)
    .buildAndSign();

  await executor.execute(callback);
}

/**
 * A simple helper function to fetch the multi-chain token balances of the multi-chain account on the two chains.
 *
 * @param chainIds - the chain IDs of the two chains to fetch balances for
 * @param token - the instance of the {@link MultichainToken} to fetch balances for
 * @param account - the instance of the {@link IMultiChainSmartAccount} to fetch balances for
 */
export async function fetchTokenBalances(
  chainIds: number[],
  token: MultichainToken,
  account: IMultiChainSmartAccount | undefined
): Promise<BalanceData> {
  const client0 = getClient(wagmiConfig, { chainId: chainIds[0] });
  const client1 = getClient(wagmiConfig, { chainId: chainIds[1] });

  if (account == null) {
    console.error('Account is null 1');
    return BALANCE_PLACEHOLDER;
  }

  const account0: SmartAccount = account.contractOn(BigInt(chainIds[0]));
  const account1: SmartAccount = account.contractOn(BigInt(chainIds[1]));

  console.log('fetchTokenBalances', chainIds, token, account0, account1);

  if (client0 == null || client1 == null) {
    throw new Error('Clients not initialized');
  }
  if (account0 == null || account1 == null) {
    return BALANCE_PLACEHOLDER;
  }

  const address = token.addressOn(BigInt(chainIds[0]));
  console.log(
    'querying balance of token',
    address,
    'on chain',
    chainIds[0],
    'for account',
    account0.address
  );

  // @ts-expect-error - ignore
  const balance0 = await readContract(client0, {
    address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account0.address],
  });
  // @ts-expect-error - ignore
  const balance1 = await readContract(client1, {
    address: token.addressOn(BigInt(chainIds[1])),
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account1.address],
  });

  // @ts-expect-error - ignore
  const balanceEth0 = (await getBalance(client0, {
    address: account0.address,
  })) as unknown as bigint;
  // @ts-expect-error - ignore
  const balanceEth1 = (await getBalance(client1, {
    address: account1.address,
  })) as unknown as bigint;

  console.log('balance0', balance0, 'balance1', balance1);

  return {
    balance0,
    balance1,
    balanceEth0,
    balanceEth1,
  };
}
