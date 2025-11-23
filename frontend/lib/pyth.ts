import { env } from '@/config/env';
import { HermesClient } from '@pythnetwork/hermes-client';
import { Address, concat, encodeFunctionData, toHex } from 'viem';

const USDC_FEED_ID =
  '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a';
const ETH_FEED_ID =
  '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace';

const hermesClient = new HermesClient('https://hermes.pyth.network');

export async function buildPaymasterData(tokenAddress: string) {
  console.log('Fetching price updates from Hermes...');

  const priceUpdates = await hermesClient.getLatestPriceUpdates([
    USDC_FEED_ID,
    ETH_FEED_ID,
  ]);

  const priceUpdateData = priceUpdates.binary.data.map(
    (vaa: string) => `0x${Buffer.from(vaa, 'base64').toString('hex')}`,
  );

  console.log('Price updates fetched:', priceUpdateData.length, 'feeds');

  const paymasterData = encodeFunctionData({
    abi: [
      {
        type: 'function',
        name: 'encode',
        inputs: [
          { name: 'token', type: 'address' },
          { name: 'priceUpdateData', type: 'bytes[]' },
        ],
        outputs: [{ type: 'bytes' }],
      },
    ],
    functionName: 'encode',
    args: [tokenAddress, priceUpdateData],
  });
  const paymasterAndData = concat([
    env.paymasterAddress as Address, // 20 bytes
    toHex(100000, { size: 16 }), // 16 bytes - validation gas
    toHex(150000, { size: 16 }), // 16 bytes - postOp gas
    paymasterData, // Dynamic - contains token + priceUpdateData
  ]);

  return { paymasterData, paymasterAndData };
}
