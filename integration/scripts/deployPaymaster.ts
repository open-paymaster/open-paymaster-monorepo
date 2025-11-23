import hre from 'hardhat';
import { OpenPaymasterAbi } from 'paymaster-sdk';
import { loadForgeArtifact } from '../src/helpers';
import { Address, Hash } from 'viem';

/**
 * Deploy the OpenPaymaster contract to the selected chain
 * 
 * Usage:
 * PYTH_ADDRESS=0x... \
 * ETH_FEED_ID=0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace \
 * pnpm hardhat run scripts/deployPaymaster.ts --network <network>
 */
async function main() {
	const [deployer] = await hre.viem.getWalletClients();
	const publicClient = await hre.viem.getPublicClient();
	const { bytecode } = loadForgeArtifact('OpenPaymaster');

	// Default ETH/USD feed ID
	const DEFAULT_ETH_FEED_ID = '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace';

	const params: { pythAddress: Address; ethFeedId: Hash } = {
		pythAddress: (process.env.PYTH_ADDRESS as Address) || '0x0000000000000000000000000000000000000000',
		ethFeedId: (process.env.ETH_FEED_ID as Hash) || DEFAULT_ETH_FEED_ID,
	};

	if (params.pythAddress === '0x0000000000000000000000000000000000000000') {
		console.warn('⚠️  No PYTH_ADDRESS provided, using zero address (will fail on-chain)');
		console.log('   Set PYTH_ADDRESS environment variable to deploy properly\n');
	}

	console.log('📋 Deployment Configuration:');
	console.log(`  Pyth Oracle: ${params.pythAddress}`);
	console.log(`  ETH Feed ID: ${params.ethFeedId}\n`);

	const hash = await deployer.deployContract({
		abi: OpenPaymasterAbi,
		bytecode,
		args: [params.pythAddress, params.ethFeedId],
	});

	console.log(`Transaction hash: ${hash}`);
	console.log('Waiting for confirmation...');

	// Wait for deployment
	const receipt = await publicClient.waitForTransactionReceipt({ hash });

	if (!receipt.contractAddress) {
		throw new Error('Deployment failed: no contract address in receipt');
	}

	console.log('\n✅ Deployment successful!');
	console.log(`Paymaster address: ${receipt.contractAddress}`);
	console.log(`Block number: ${receipt.blockNumber}`);
	console.log(`Gas used: ${receipt.gasUsed}`);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
