// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {PythOracleAdapter} from "../contracts/PythOracleAdapter.sol";
import {PythMock} from "./mocks/PythMock.sol";

contract PythOracleTest is Test {
    PythOracleAdapter public oracle;
    PythMock public pyth;

    bytes32 public tokenFeedId;
    bytes32 public ethFeedId;

    function setUp() public {
        // Deploy mocks
        pyth = new PythMock();

        // Setup feed IDs (using real Pyth feed IDs for realism)
        tokenFeedId = bytes32(uint256(0x1)); // Mock USDC/USD feed ID
        ethFeedId = bytes32(uint256(0x2)); // Mock ETH/USD feed ID

        // Deploy PythOracleAdapter
        oracle = new PythOracleAdapter(address(pyth), ethFeedId);
    }

    function test_GetTokenPriceInEth_BasicCase() public {
        // USDC = $1.00 (price = 100000000, expo = -8)
        // ETH = $2500.00 (price = 250000000000, expo = -8)
        // Expected: 0.0004 ETH per USDC = 400000000000000 wei

        pyth.setPrice(tokenFeedId, 100000000, -8);
        pyth.setPrice(ethFeedId, 250000000000, -8);

        uint256 priceInEth = oracle.getTokenPriceInEth(tokenFeedId);

        // 1 USDC = 0.0004 ETH = 400000000000000 wei
        assertEq(priceInEth, 400000000000000, "Incorrect USDC/ETH price");
    }

    function test_GetTokenPriceInEth_ExpensiveToken() public {
        // WBTC = $40,000.00 (price = 4000000000000, expo = -8)
        // ETH = $2500.00 (price = 250000000000, expo = -8)
        // Expected: 16 ETH per WBTC = 16e18 wei

        pyth.setPrice(tokenFeedId, 4000000000000, -8);
        pyth.setPrice(ethFeedId, 250000000000, -8);

        uint256 priceInEth = oracle.getTokenPriceInEth(tokenFeedId);

        // 1 WBTC = 16 ETH = 16e18 wei
        assertEq(priceInEth, 16e18, "Incorrect WBTC/ETH price");
    }

    function test_GetTokenPriceInEth_DifferentExponents() public {
        // Token = $10.00 (price = 1000000, expo = -5)
        // ETH = $2000.00 (price = 200000000, expo = -5)
        // Expected: 0.005 ETH per token = 5000000000000000 wei

        pyth.setPrice(tokenFeedId, 1000000, -5);
        pyth.setPrice(ethFeedId, 200000000, -5);

        uint256 priceInEth = oracle.getTokenPriceInEth(tokenFeedId);

        // 1 TOKEN = 0.005 ETH = 5000000000000000 wei
        assertEq(priceInEth, 5000000000000000, "Incorrect price with different exponents");
    }

    function test_GetTokenPriceInEth_MixedExponents() public {
        // Token = $1.00 (price = 100000000, expo = -8)
        // ETH = $2500.00 (price = 25000000, expo = -4)
        // Expected: 0.0004 ETH per token = 400000000000000 wei

        pyth.setPrice(tokenFeedId, 100000000, -8);
        pyth.setPrice(ethFeedId, 25000000, -4);

        uint256 priceInEth = oracle.getTokenPriceInEth(tokenFeedId);

        // 1 TOKEN = 0.0004 ETH = 400000000000000 wei
        assertEq(priceInEth, 400000000000000, "Incorrect price with mixed exponents");
    }

    function test_GetTokenPriceInEth_HighPrecision() public {
        // Token = $0.001 (price = 100000, expo = -8)
        // ETH = $3333.33 (price = 333333000000, expo = -8)
        // Expected: ~0.0000003 ETH per token = 300000000000 wei

        pyth.setPrice(tokenFeedId, 100000, -8);
        pyth.setPrice(ethFeedId, 333333000000, -8);

        uint256 priceInEth = oracle.getTokenPriceInEth(tokenFeedId);

        // Allow small rounding error
        assertApproxEqRel(priceInEth, 300000000000, 0.01e18, "Incorrect high precision price");
    }

    function test_RevertWhen_InvalidTokenFeedId() public {
        bytes32 invalidFeedId = bytes32(0);

        vm.expectRevert(abi.encodeWithSelector(PythOracleAdapter.InvalidTokenFeedId.selector, invalidFeedId));
        oracle.getTokenPriceInEth(invalidFeedId);
    }

    function test_RevertWhen_TokenPriceIsZero() public {
        pyth.setPrice(tokenFeedId, 0, -8);
        pyth.setPrice(ethFeedId, 250000000000, -8);

        vm.expectRevert(abi.encodeWithSelector(PythOracleAdapter.InvalidPrice.selector, tokenFeedId));
        oracle.getTokenPriceInEth(tokenFeedId);
    }

    function test_RevertWhen_EthPriceIsZero() public {
        pyth.setPrice(tokenFeedId, 100000000, -8);
        pyth.setPrice(ethFeedId, 0, -8);

        vm.expectRevert(abi.encodeWithSelector(PythOracleAdapter.InvalidPrice.selector, tokenFeedId));
        oracle.getTokenPriceInEth(tokenFeedId);
    }

    function test_RevertWhen_NegativePrice() public {
        pyth.setPrice(tokenFeedId, -100000000, -8);
        pyth.setPrice(ethFeedId, 250000000000, -8);

        // Should revert when casting negative to uint
        vm.expectRevert();
        oracle.getTokenPriceInEth(tokenFeedId);
    }

    function test_GetTokenPriceInEth_RealWorldScenario() public {
        // Simulate real Pyth price feeds
        // USDC = $1.0005 (price = 100050000, expo = -8)
        // ETH = $3,247.82 (price = 324782000000, expo = -8)
        // Expected: ~0.000308 ETH = 308000000000000 wei

        pyth.setPrice(tokenFeedId, 100050000, -8);
        pyth.setPrice(ethFeedId, 324782000000, -8);

        uint256 priceInEth = oracle.getTokenPriceInEth(tokenFeedId);

        // 1 USDC = 1.0005 / 3247.82 ETH ≈ 0.000308 ETH
        assertApproxEqRel(priceInEth, 308000000000000, 0.01e18, "Incorrect real world price");
    }

    function testFuzz_GetTokenPriceInEth(uint64 tokenPriceUint, uint64 ethPriceUint) public {
        // Bound inputs to reasonable ranges similar to real Pyth feeds
        // Token prices: $0.0001 to $100,000 (with expo -8)
        tokenPriceUint = uint64(bound(tokenPriceUint, 10000, 10000000000000));
        // ETH prices: $100 to $10,000 (with expo -8)
        ethPriceUint = uint64(bound(ethPriceUint, 10000000000, 1000000000000));

        // Use standard -8 exponent (typical for Pyth USD feeds)
        int32 tokenExpo = -8;
        int32 ethExpo = -8;

        // Ensure price ratio is reasonable
        // tokenPrice/ethPrice should produce reasonable ETH amounts
        uint256 priceRatio = (uint256(tokenPriceUint) * 1e18) / uint256(ethPriceUint);
        vm.assume(priceRatio >= 1e12); // At least 0.000001 ratio
        vm.assume(priceRatio <= 100e18); // At most 100x ratio

        int64 tokenPrice = int64(tokenPriceUint);
        int64 ethPrice = int64(ethPriceUint);

        pyth.setPrice(tokenFeedId, tokenPrice, tokenExpo);
        pyth.setPrice(ethFeedId, ethPrice, ethExpo);

        uint256 priceInEth = oracle.getTokenPriceInEth(tokenFeedId);

        // Verify result is non-zero and reasonable
        assertGt(priceInEth, 0, "Price should be greater than zero");
        // With bounded inputs, max ratio is 100, so max price is 100 ETH
        assertLe(priceInEth, 100e18, "Price calculation error");
    }
}

