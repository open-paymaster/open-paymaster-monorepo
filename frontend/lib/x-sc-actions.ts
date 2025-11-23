import type { SmartAccount } from 'viem/account-abstraction';
import { getAccount, getWalletClient } from '@wagmi/core';
import { AmbireMultiChainSmartAccount } from '@eil-protocol/accounts';
import { getClient, getBalance, readContract } from 'wagmi/actions';
import {
  erc20Abi,
  parseUnits,
  zeroAddress,
  type Address,
  type WalletClient,
} from 'viem';
import {
  CrossChainSdk,
  TransferAction,
  MultichainToken,
  AmbireBundlerManager,
  type ExecCallback,
  type IMultiChainSmartAccount,
} from '@eil-protocol/sdk';
import tokensJson from '@/data/tokens.json';

import { chainIds, wagmiConfig } from '@/config/wagmi-config';
import { arbitrum, base } from 'viem/chains';
import { env } from '@/config/env';
import { buildPaymasterData } from './pyth';

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
  try {
    const account = getAccount(wagmiConfig);
    const walletClient = await getWalletClient(wagmiConfig, { connector: account.connector }); // prettier-ignore
    return walletClient;
  } catch (error) {
    console.error('Failed to get wallet client:', error);
    throw error;
  }
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
    new Map<bigint, Address>(),
  );

  const walletAccount = getAccount(wagmiConfig)?.address ?? zeroAddress;
  const ambireAccount = new AmbireMultiChainSmartAccount(
    walletClient,
    walletAccount,
    [BigInt(chainIds[0]), BigInt(chainIds[1])],
    ambireBundlerManager,
  );

  await ambireAccount.init();
  const crossChainSdk = new CrossChainSdk();

  return { sdk: crossChainSdk, account: ambireAccount };
}

export async function crossChainTransfer(
  amount: bigint,
  recipient: Address,
  callback: ExecCallback,
): Promise<void> {
  const { sdk, account } = await createEilSdk();

  const chainId0 = BigInt(arbitrum.id);
  const chainId1 = BigInt(base.id);

  const token = sdk.createToken('USDC', tokensJson.USDC);

  const { paymasterAndData } = await buildPaymasterData(token.addressOn(BigInt(base.id))); // prettier-ignore

  const parsedAmount = parseUnits(amount.toString(), 6);

  const userOpOverrideInOriginChain = {
    // paymaster: env.paymasterAddress as Address,
    paymasterAndData,
    // paymasterVerificationGasLimit: BigInt(100_000),
    // paymasterPostOpGasLimit: BigInt(100_000),
    maxFeePerGas: BigInt(100_000_000),
    maxPriorityFeePerGas: BigInt(100),
  };
  const userOpOverrideInDestinyChain = {
    maxFeePerGas: BigInt(100_000),
    maxPriorityFeePerGas: BigInt(100),
  };

  const executor = await sdk
    .createBuilder()

    .startBatch(chainId0)
    .addVoucherRequest({
      ref: 'voucher_request_1',
      destinationChainId: chainId1,
      tokens: [{ token, amount: parsedAmount }],
    })
    .overrideUserOp(userOpOverrideInOriginChain)
    .endBatch()

    .startBatch(chainId1)
    .useAllVouchers()
    .addAction(
      new TransferAction({
        token,
        recipient,
        amount: parsedAmount,
      }),
    )
    .overrideUserOp(userOpOverrideInDestinyChain)
    .endBatch()

    .useAccount(account)
    .buildAndSign();

  try {
    await executor.execute(callback);
  } catch (error) {
    console.error('Error executing transfer:', error);
    throw error;
  }
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
  account: IMultiChainSmartAccount | undefined,
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
    account0.address,
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
