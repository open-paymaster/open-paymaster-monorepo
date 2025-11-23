import hre from 'hardhat';
import { pythMockAbi } from 'paymaster-sdk';
import { Address } from 'viem';

/**
 * Set prices on the deployed PythMock contract
 * 
 * Usage:
 * 
 * Default prices (USDC + ETH):
 *   PYTH_MOCK_ADDRESS=0x... pnpm hardhat run scripts/oracle/setPythOraclePrice.ts --network <network>
 * 
 * Custom single price:
 *   PYTH_MOCK_ADDRESS=0x... \
 *   FEED_ID=0xeaa020... \
 *   PRICE=1.25 \
 *   pnpm hardhat run scripts/oracle/setPythOraclePrice.ts --network <network>
 */

// Real Pyth feed IDs
const FEED_IDS = {
	// Stablecoins
	USDC_USD: '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
	USDT_USD: '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
	DAI_USD: '0xb0948a5e5313200c632b51bb5ca32f6de0d36e9950a942d19751e833f70dabfd',
	
	// Major tokens
	ETH_USD: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
	BTC_USD: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
	WETH_USD: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace', // Same as ETH
} as const;

interface PriceConfig {
	feedId: `0x${string}`;
	name?: string;
	price: number;      // In human-readable format (e.g., 1.00 for $1.00)
	expo: number;       // Exponent (typically -8)
}

async function main() {
	const [deployer] = await hre.viem.getWalletClients();
	const publicClient = await hre.viem.getPublicClient();

	// Get PythMock address from env
	const pythMockAddress = process.env.PYTH_MOCK_ADDRESS as Address;
	
	if (!pythMockAddress) {
		throw new Error('PYTH_MOCK_ADDRESS environment variable is required');
	}

	console.log(`Setting prices on PythMock at: ${pythMockAddress}\n`);

	// Check if custom price is provided
	const customFeedId = process.env.FEED_ID as `0x${string}` | undefined;
	const customPrice = process.env.PRICE ? parseFloat(process.env.PRICE) : undefined;
	const customExpo = process.env.EXPO ? parseInt(process.env.EXPO) : -8;

	let pricesToSet: PriceConfig[];

	if (customFeedId && customPrice) {
		// Custom mode: Set single price
		console.log('🎯 Custom price mode\n');
		pricesToSet = [
			{
				feedId: customFeedId,
				name: 'CUSTOM',
				price: customPrice,
				expo: customExpo,
			},
		];
	} else {
		// Default mode: Set common prices
		console.log('📊 Default prices mode\n');
		pricesToSet = [
			{
				feedId: FEED_IDS.USDC_USD,
				name: 'USDC/USD',
				price: 1.00,
				expo: -8,
			},
			{
				feedId: FEED_IDS.ETH_USD,
				name: 'ETH/USD',
				price: 2500.00,
				expo: -8,
			},
		];
	}

	for (const config of pricesToSet) {
		// Convert human-readable price to int64 format
		// e.g., 1.00 with expo -8 = 100000000
		const priceInt64 = BigInt(Math.floor(config.price * Math.pow(10, -config.expo)));
		
		console.log(`${config.name || config.feedId.slice(0, 10) + '...'}`);
		console.log(`  Feed ID: ${config.feedId}`);
		console.log(`  Price: $${config.price.toLocaleString()}`);
		console.log(`  Encoded: ${priceInt64} (expo: ${config.expo})`);

		try {
			const hash = await deployer.writeContract({
				address: pythMockAddress,
				abi: pythMockAbi,
				functionName: 'setPrice',
				args: [config.feedId, priceInt64, config.expo],
			});

			const receipt = await publicClient.waitForTransactionReceipt({ hash });
			console.log(`  ✅ Set (gas: ${receipt.gasUsed})\n`);
		} catch (error) {
			console.error(`  ❌ Failed to set price:`, error);
		}
	}

	console.log('✅ All prices set!');
	
	if (!customFeedId) {
		console.log('\n💡 Available Feed IDs:');
		Object.entries(FEED_IDS).forEach(([name, id]) => {
			console.log(`  ${name.padEnd(12)}: ${id}`);
		});
		console.log('\n💡 To set a custom price:');
		console.log('  PYTH_MOCK_ADDRESS=0x... FEED_ID=0x... PRICE=1.25 pnpm hardhat run scripts/oracle/setPythOraclePrice.ts');
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});

