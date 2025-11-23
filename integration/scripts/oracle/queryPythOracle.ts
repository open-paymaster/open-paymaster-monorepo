import hre from 'hardhat';
import { pythOracleAdapterAbi, pythMockAbi } from 'paymaster-sdk';
import { getContract, Address, formatEther } from 'viem';

/**
 * Query prices from the PythOracleAdapter contract
 * 
 * Usage:
 * PYTH_ORACLE_ADDRESS=0x... \
 * PYTH_ADDRESS=0x... \
 * TOKEN_FEED_ID=0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a \
 * pnpm hardhat run scripts/queryPythOracle.ts --network <network>
 */

// Real Pyth feed IDs
const FEED_IDS = {
	USDC_USD: '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
	ETH_USD: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
	BTC_USD: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
} as const;

async function main() {
	const publicClient = await hre.viem.getPublicClient();

	// Get addresses from environment
	const pythOracleAddress = process.env.PYTH_ORACLE_ADDRESS as Address;
	const pythAddress = process.env.PYTH_ADDRESS as Address;
	const tokenFeedId = (process.env.TOKEN_FEED_ID as `0x${string}`) || FEED_IDS.USDC_USD;

	if (!pythOracleAddress) {
		throw new Error('PYTH_ORACLE_ADDRESS environment variable is required');
	}

	console.log('📊 Querying Pyth Oracle Adapter\n');
	console.log(`  Oracle Adapter: ${pythOracleAddress}`);
	console.log(`  Token Feed ID: ${tokenFeedId}`);

	// Get the PythOracleAdapter contract
	const oracleContract = getContract({
		address: pythOracleAddress,
		abi: pythOracleAdapterAbi,
		client: { public: publicClient },
	});

	// Query the ETH feed ID
	const ethFeedId = await oracleContract.read.ethFeedId();
	console.log(`  ETH Feed ID: ${ethFeedId}\n`);

	// If Pyth address provided, query raw Pyth data
	if (pythAddress) {
		const pythContract = getContract({
			address: pythAddress,
			abi: pythMockAbi,
			client: { public: publicClient },
		});

		console.log('🔍 Raw Pyth Data:');
		
		// Get token price
		const tokenPriceData = await pythContract.read.getPriceUnsafe([tokenFeedId]);
		console.log(`  TOKEN/USD:`);
		console.log(`    Price: ${tokenPriceData.price}`);
		console.log(`    Expo: ${tokenPriceData.expo}`);
		console.log(`    Actual: $${Number(tokenPriceData.price) * Math.pow(10, tokenPriceData.expo)}`);
		console.log(`    Publish Time: ${new Date(Number(tokenPriceData.publishTime) * 1000).toISOString()}`);

		// Get ETH price
		const ethPriceData = await pythContract.read.getPriceUnsafe([ethFeedId]);
		console.log(`  ETH/USD:`);
		console.log(`    Price: ${ethPriceData.price}`);
		console.log(`    Expo: ${ethPriceData.expo}`);
		console.log(`    Actual: $${Number(ethPriceData.price) * Math.pow(10, ethPriceData.expo)}`);
		console.log(`    Publish Time: ${new Date(Number(ethPriceData.publishTime) * 1000).toISOString()}\n`);
	}

	// Query the calculated TOKEN/ETH price from the adapter
	const priceInEth = await oracleContract.read.getTokenPriceInEth([tokenFeedId]);

	console.log('💰 Calculated TOKEN/ETH Price:');
	console.log(`  Wei per token: ${priceInEth}`);
	console.log(`  ETH per token: ${formatEther(priceInEth)}`);
	
	// Calculate tokens needed for 0.001 ETH (example)
	const ethAmount = BigInt(1e15); // 0.001 ETH
	const tokensNeeded = (ethAmount * BigInt(1e18)) / priceInEth;
	console.log(`\n📈 Example: For 0.001 ETH gas cost:`);
	console.log(`  Tokens needed: ${formatEther(tokensNeeded)}`);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
