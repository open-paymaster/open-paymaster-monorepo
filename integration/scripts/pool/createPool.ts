import hre from 'hardhat';
import { OpenPaymasterAbi } from 'paymaster-sdk';
import { getContract } from 'viem';
import { getChainConfig } from '../src/config';

/**
 * Deploy the OpenPaymaster contract to the selected chain
 */
async function main() {
	const [deployer] = await hre.viem.getWalletClients();
	const [chainConfig] = getChainConfig();
	const publicClient = await hre.viem.getPublicClient();

	const paymasterContract = getContract({
		address: chainConfig.PAYMASTER,
		abi: OpenPaymasterAbi,
		client: { public: publicClient, wallet: deployer },
	});

	const hash = await paymasterContract.write.initializePool([
		chainConfig.FTC,
		100,
		100,
		chainConfig.ORACLE,
	]);
	console.log('hash', hash);

	await publicClient.waitForTransactionReceipt({ hash });

	const pool = await paymasterContract.read.pools([chainConfig.USDC]);
	console.log('pool', pool);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
