import hre from 'hardhat';
import { oracleMockAbi } from 'paymaster-sdk';
import { getContract, parseEther } from 'viem';
import { getChainConfig } from '../src/config';

/**
 * Deploy the UniversalPaymaster contract to the selected chain
 */
async function main() {
    const [deployer] = await hre.viem.getWalletClients();
	const [chainConfig] = getChainConfig();
	const publicClient = await hre.viem.getPublicClient();

	console.log('Oracle address', chainConfig.ORACLE);
	
	const oracleContract = getContract({
		address: chainConfig.ORACLE,
		abi: oracleMockAbi,
		client: { public: publicClient, wallet: deployer },
	});

    const ethPrice = 2794;
    const oneDollarInWei = parseEther((1 / ethPrice).toString());
    console.log('One dollar in wei', oneDollarInWei);

	const hash = await oracleContract.write.setTokenPriceInEth([chainConfig.USDC, oneDollarInWei]);
	console.log('Hash', hash);

	await publicClient.waitForTransactionReceipt({ hash });

	console.log('Token price set');
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
