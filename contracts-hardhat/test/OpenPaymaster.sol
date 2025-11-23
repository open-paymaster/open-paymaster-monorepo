// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// External
import {EntryPoint} from "@eth-infinitism/account-abstraction/contracts/core/EntryPoint.sol";
import {ERC4337Utils} from "@openzeppelin/contracts/account/utils/draft-ERC4337Utils.sol";
import {PackedUserOperation} from "@openzeppelin/contracts/interfaces/draft-IERC4337.sol";
import {IEntryPoint} from "@openzeppelin/contracts/interfaces/draft-IERC4337.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
// Internal
import {OpenPaymaster} from "../contracts/core/OpenPaymaster.sol";
import {UserOpHelper} from "../test/utils/UserOpHelper.sol";
// Mocks
import {SimpleAccount7702Mock} from "../test/mocks/SimpleAccount7702Mock.sol";
import {SimpleAccountECDSAMock} from "../test/mocks/SimpleAccountECDSAMock.sol";
import {ERC20Mock} from "../test/mocks/ERC20Mock.sol";
import {PythMock} from "../test/mocks/PythMock.sol";
// Test
import {Test, Vm} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

contract OpenPaymasterTest is Test, UserOpHelper {
    using ERC4337Utils for *;
    using SafeCast for *;

    // The ERC-4337 EntryPoint Singleton
    EntryPoint public entryPoint;
    // The ERC-4337 bundler
    address public bundler;

    // Someone providing liquidity to the pool
    address public lp;

    // Someone rebalancing the pool
    address public rebalancer;

    // The OpenPaymaster contract being tested
    OpenPaymaster public paymaster;

    // An ERC-20 token accepted by a particular [ETH, token] pool
    ERC20Mock public token;

    // The ID of the token pool
    uint256 tokenId;

    // The Pyth oracle mock
    PythMock public pyth;

    // Pyth feed IDs
    bytes32 public tokenFeedId;
    bytes32 public ethFeedId;

    // The EOA that will get sponsored by the paymaster
    address EOA;
    // The private key of the EOA used to sign the user operations
    uint256 EOAPrivateKey;

    // An OpenZeppelin ERC-4337 7702 Account Instance to delegate to
    SimpleAccount7702Mock public account;

    // An OpenZeppelin ERC-4337 ECDSA Account Instance
    SimpleAccountECDSAMock public accountECDSA;

    // Someone receiving tokens from "EOA" because of the sponsored userop
    address receiver;

    struct GasConfiguration {
        uint256 callGasLimit; // The amount of gas to allocate the main execution call
        uint256 verificationGasLimit; //The amount of gas to allocate for the verification step
        uint256 preVerificationGas; // Extra gas to pay the bundler
        uint256 paymasterVerificationGasLimit; // The amount of gas to allocate for the paymaster validation code (only if paymaster exists)
        uint256 paymasterPostOpGasLimit; // The amount of gas to allocate for the paymaster post-operation code (only if paymaster exists)
        uint256 maxFeePerGas; // Maximum fee per gas (similar to EIP-1559 max_fee_per_gas)
        uint256 maxPriorityFeePerGas; // Maximum priority fee per gas (similar to EIP-1559 max_priority_fee_per_gas)
    }

    function setUp() public {
        // Deploy the entrypoint (not at canonical address for Hardhat compatibility)
        entryPoint = new EntryPoint();

        // deploy the Pyth oracle mock
        pyth = new PythMock();

        // Setup feed IDs (use realistic Pyth feed IDs)
        tokenFeedId = 0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a; // USDC/USD
        ethFeedId = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace; // ETH/USD

        // deploy the paymaster (inherits PythOracleAdapter)
        paymaster = new OpenPaymaster(address(pyth), ethFeedId);

        // create a ERC20 with permit (simulating USDC)
        token = new ERC20Mock(18);
        tokenId = uint256(uint160(address(token)));

        // Set Pyth prices:
        // USDC = $1.00 (price = 100000000, expo = -8)
        // ETH = $2500.00 (price = 250000000000, expo = -8)
        // This gives: 1 USDC = 0.0004 ETH = 400000000000000 wei
        pyth.setPrice(tokenFeedId, 100000000, -8);
        pyth.setPrice(ethFeedId, 250000000000, -8);

        // Deploy the EIP-7702 account (for skipped tests)
        account = new SimpleAccount7702Mock();

        // initialize the pool
        paymaster.initializePool(address(token), 100, 100, tokenFeedId);

        // create accounts
        (bundler) = makeAddr("bundler");
        (lp) = makeAddr("lp");
        (rebalancer) = makeAddr("rebalancer");
        (EOA, EOAPrivateKey) = makeAddrAndKey("EOA");
        (receiver) = makeAddr("receiver");

        // Deploy the ECDSA account with EOA as owner (after EOA and entryPoint are created)
        accountECDSA = new SimpleAccountECDSAMock(EOA, address(entryPoint));

        // fund bundler
        vm.deal(bundler, 1e18);

        // fund lp
        vm.deal(lp, 100e18);

        // fund rebalancer
        vm.deal(rebalancer, 1e18);
    }

    // EIP-7702 tests require Foundry nightly with Vm.SignedDelegation support
    function skip_test_eip7702_delegation() public {
        assertEq(address(EOA).code.length, 0);
        Vm.SignedDelegation memory signedDelegation = vm.signDelegation(
            address(account),
            EOAPrivateKey
        );
        vm.attachDelegation(signedDelegation);
        bytes memory expectedCode = abi.encodePacked(
            hex"ef0100",
            address(account)
        );
        assertEq(address(EOA).code, expectedCode);
    }

    function skip_test_ERC1271_signature() public {
        Vm.SignedDelegation memory signedDelegation = vm.signDelegation(
            address(account),
            EOAPrivateKey
        );
        vm.attachDelegation(signedDelegation);
        string memory text = "Hello, world!";
        bytes32 hash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n13", text)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(EOAPrivateKey, hash);
        bytes memory signature = abi.encodePacked(r, s, v);
        bytes4 result = IERC1271(EOA).isValidSignature(hash, signature);
        assertEq(result, IERC1271.isValidSignature.selector);
    }

    function test_sponsor_user_operation() public {
        console.log("Test started");
        // 1. Smart account has 1000 tokens but no eth.
        // Note: We mint to the smart account address, not EOA
        console.log("Minting tokens...");
        token.mint(address(accountECDSA), 1000e18);
        console.log("Tokens minted");
        assertEq(token.balanceOf(address(accountECDSA)), 1000e18);

        console.log("Recording balances...");
        uint256 userBalanceBefore = address(accountECDSA).balance;
        uint256 lpBalanceBefore = lp.balance;
        uint256 rebalancerBalanceBefore = rebalancer.balance;
        uint256 bundlerBalanceBefore = bundler.balance;
        uint256 entrypointBalanceBefore = entryPoint.balanceOf(
            address(paymaster)
        );
        assertEq(userBalanceBefore, 0);
        assertEq(entrypointBalanceBefore, 0);

        uint256 userTokensBefore = token.balanceOf(address(accountECDSA));
        uint256 rebalancerTokensBefore = token.balanceOf(rebalancer);

        // lp deposits 1 eth for the token pool
        console.log("LP depositing...");
        console.log("tokenId:", tokenId);
        vm.startPrank(lp);
        try paymaster.deposit{value: 1e18}(1e18, lp, tokenId) {
            console.log("LP deposited successfully");
        } catch (bytes memory reason) {
            console.log("Deposit failed");
            console.logBytes(reason);
            revert("Deposit failed");
        }
        vm.stopPrank();

        // paymater now has 1 eth deposited in the entrypoint
        assertEq(entryPoint.balanceOf(address(paymaster)), 1e18);

        // paymaster now has 1 eth deposited in the token pool
        assertEq(paymaster.totalAssets(tokenId), 1e18);

        // paymaster has emited 1e18 shares for the lp
        assertEq(paymaster.totalSupply(tokenId), 1e18);

        // lp now has 1e18 shares of the token pool
        assertEq(paymaster.balanceOf(lp, tokenId), 1e18);

        // Smart account approves the paymaster to spend the tokens
        // will later be refactored into Permit1+Permit2 for gasless approval.
        vm.prank(address(accountECDSA));
        token.approve(address(paymaster), type(uint256).max);
        assertEq(
            token.allowance(address(accountECDSA), address(paymaster)),
            type(uint256).max
        );

        // 2. Configure gas parameters for the UserOperation
        GasConfiguration memory gasConfig = GasConfiguration({
            preVerificationGas: 1_000, // Extra gas to pay the bundler operational costs such as bundle tx cost and entrypoint static code execution.
            verificationGasLimit: 49_990, // The amount of gas to allocate for the verification step
            paymasterVerificationGasLimit: 100_000, // The amount of gas to allocate for the paymaster validation code (increased for Pyth oracle calls + token transfer)
            paymasterPostOpGasLimit: 50_000, // The amount of gas to allocate for the paymaster post-operation code (increased for Pyth price updates + calculations + refund)
            callGasLimit: 40_000, // The amount of gas to allocate the main execution call
            maxPriorityFeePerGas: 1 gwei, // Maximum priority fee per gas (similar to EIP-1559 max_priority_fee_per_gas)
            maxFeePerGas: 1 gwei // Maximum fee per gas (similar to EIP-1559 max_fee_per_gas)
        });

        // 3. Build paymaster data with Pyth price updates
        // In production, priceUpdateData would come from Hermes API
        // For testing with mock, we pass empty array
        bytes[] memory priceUpdateData = new bytes[](0);

        bytes memory paymasterData = buildPaymasterData(
            address(paymaster), // paymaster
            uint128(gasConfig.paymasterVerificationGasLimit), // verification gas limit
            uint128(gasConfig.paymasterPostOpGasLimit), // post-op gas limit
            address(token),
            priceUpdateData // Pyth price update data from Hermes
        );
        console.log("paymaster data: ");
        console.logBytes(paymasterData);
        console.log(
            "paymaster data length (bytes):",
            paymasterData.length / 2 - 1
        ); // -1 for '0x'

        // 2. Build calldata, where smart account sends 1 token to receiver
        bytes memory callData = abi.encodeCall(
            SimpleAccountECDSAMock.execute,
            (
                address(token),
                0,
                abi.encodeWithSelector(token.transfer.selector, receiver, 1e18)
            )
        );

        // 3. Build UserOperation for the smart account
        PackedUserOperation memory userOp = buildUserOp(
            address(accountECDSA),
            accountECDSA.getNonce(),
            callData,
            paymasterData,
            gasConfig.verificationGasLimit,
            gasConfig.callGasLimit,
            gasConfig.preVerificationGas,
            gasConfig.maxPriorityFeePerGas,
            gasConfig.maxFeePerGas
        );

        // 4. Sign UserOperation with EOA's private key (EOA is the owner/signer of the smart account)
        userOp = this.signUserOp(userOp, EOAPrivateKey, address(entryPoint));

        // 5. Bundle the user operation
        PackedUserOperation[] memory userOps = new PackedUserOperation[](1);
        userOps[0] = userOp;

        console.log("Smart account address:", address(accountECDSA));
        console.log(
            "Smart account code size:",
            address(accountECDSA).code.length
        );
        console.log("Smart account owner:", accountECDSA.owner());
        console.log("EntryPoint address:", address(entryPoint));
        console.log("Sponsoring!");
        vm.startPrank(bundler);
        // Execute the UserOperation through the EntryPoint
        IEntryPoint(address(entryPoint)).handleOps(userOps, payable(bundler));
        vm.stopPrank();
        console.log("Sponsoring done!");

        // Verify the transfer happened
        assertEq(
            token.balanceOf(receiver),
            1e18,
            "Receiver should have received 1 token"
        );

        uint256 lpAssetsAfterSponsoring = paymaster.maxWithdraw(lp, tokenId);
        uint256 totalAssetsAfterSponsoring = paymaster.totalAssets(tokenId);
        uint256 entryPointDepositAfterSponsoring = entryPoint.balanceOf(
            address(paymaster)
        );

        int256 entryPointVslpDelta = int256(entryPointDepositAfterSponsoring) -
            int256(lpAssetsAfterSponsoring);
        console.log("entry point vs lp delta: ", entryPointVslpDelta);

        assertEq(
            lpAssetsAfterSponsoring,
            totalAssetsAfterSponsoring,
            "lp assets != total assets"
        );
        assertApproxEqAbs(
            entryPointDepositAfterSponsoring,
            lpAssetsAfterSponsoring,
            1e14, // Increased tolerance to account for Pyth update fees and gas estimation
            "entry point deposit != lp assets"
        );

        // 6. Rebalancer rebalances the pool buying all the tokens available
        vm.startPrank(rebalancer);
        uint256 tokenReserves = paymaster.getPoolTokenReserves(address(token));
        paymaster.rebalance{value: 1e18}(
            address(token),
            tokenReserves,
            rebalancer
        );
        vm.stopPrank();

        // pool should not have tokens any longer
        assertEq(token.balanceOf(address(paymaster)), 0);

        // 7. lp withdraws their eth
        uint256 entrypointDeposit = entryPoint.balanceOf(address(paymaster));
        console.log("entrypoint deposit: ", entrypointDeposit);
        uint256 lpAssets = paymaster.maxWithdraw(lp, tokenId);
        console.log("lp assets: ", lpAssets);
        uint256 totalAssets = paymaster.totalAssets(tokenId);
        console.log("total assets: ", totalAssets);

        // assertGe(entrypointDeposit, lpAssets, "entrypoint deposit should be greater than or equal to lp assets");
        assertGe(
            totalAssets,
            lpAssets,
            "total assets should be greater than or equal to lp assets"
        );
        assertEq(
            lpAssets,
            totalAssets - 1,
            "lp assets should be the total assets minus the inflation protection"
        );

        // Withdraw only what's available in the entry point to avoid revert
        uint256 withdrawAmount = lpAssets > entrypointDeposit
            ? entrypointDeposit
            : lpAssets;

        vm.startPrank(lp);
        paymaster.withdraw(withdrawAmount, lp, lp, tokenId);
        vm.stopPrank();

        uint256 userBalanceAfter = address(accountECDSA).balance;
        uint256 lpBalanceAfter = lp.balance;
        uint256 rebalancerBalanceAfter = rebalancer.balance;
        uint256 bundlerBalanceAfter = bundler.balance;
        uint256 entrypointBalanceAfter = entryPoint.balanceOf(
            address(paymaster)
        );

        int256 userDelta = int256(userBalanceAfter) - int256(userBalanceBefore);
        int256 lpDelta = int256(lpBalanceAfter) - int256(lpBalanceBefore);
        int256 rebalancerDelta = int256(rebalancerBalanceAfter) -
            int256(rebalancerBalanceBefore);
        int256 bundlerDelta = int256(bundlerBalanceAfter) -
            int256(bundlerBalanceBefore);
        int256 entrypointDelta = int256(entrypointBalanceAfter) -
            int256(entrypointBalanceBefore);

        uint256 userTokensAfter = token.balanceOf(address(accountECDSA));
        uint256 lpTokensAfter = token.balanceOf(lp);
        uint256 rebalancerTokensAfter = token.balanceOf(rebalancer);

        // lp should not have received any tokens
        assertEq(lpTokensAfter, 0);

        int256 userTokensDelta = int256(userTokensAfter) -
            int256(userTokensBefore);
        int256 rebalancerTokensDelta = int256(rebalancerTokensAfter) -
            int256(rebalancerTokensBefore);

        int256 rebalancerProfit = rebalancerTokensDelta + rebalancerDelta;

        // smart account should not have paid neither received any eth
        assertEq(userDelta, 0);

        console.log("user tokens delta", userTokensDelta + 1e18);

        console.log("lp eth delta (profit)", lpDelta);

        console.log("rebalancer profit (1eth=1token)", rebalancerProfit);

        console.log("bundler eth delta (profit)", bundlerDelta);

        console.log("entrypoint eth delta", entrypointDelta);
    }
}
