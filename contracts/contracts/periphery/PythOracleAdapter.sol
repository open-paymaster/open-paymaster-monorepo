// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import {IOracle} from "../interfaces/IOracle.sol";

/// @title PythOracle
/// @dev Oracle adapter that converts Pyth USD-denominated feeds to TOKEN/ETH prices.
contract PythOracleAdapter is IOracle {
    IPyth public immutable pyth;

    /// @dev Pyth price feed ID for ETH/USD
    bytes32 public immutable ethFeedId;

    error InvalidTokenFeedId(bytes32 tokenFeedId);

    error InvalidPrice(bytes32 tokenFeedId);

    constructor(address _pyth, bytes32 _ethFeedId) {
        pyth = IPyth(_pyth);
        ethFeedId = _ethFeedId;
    }

    /// @dev Returns the price of a token in ETH (wei per token).
    /// WARNING: This reads cached prices. For fresh prices, call pyth.updatePriceFeeds() first.
    function getTokenPriceInEth(bytes32 tokenFeedId) public view returns (uint256 priceInEth) {
        require(tokenFeedId != bytes32(0), InvalidTokenFeedId(tokenFeedId));

        // Get TOKEN/USD and ETH/USD prices (uses cached data)
        PythStructs.Price memory tokenUsd = pyth.getPriceUnsafe(tokenFeedId);
        PythStructs.Price memory ethUsd = pyth.getPriceUnsafe(ethFeedId);

        require(tokenUsd.price > 0 && ethUsd.price > 0, InvalidPrice(tokenFeedId));

        // Calculate TOKEN/ETH = TOKEN/USD ÷ ETH/USD
        // Both prices are in USD, so division gives us TOKEN/ETH ratio
        // We need to handle the exponents properly
        return _calculateRatio(tokenUsd, ethUsd);
    }

    /// @dev Calculates TOKEN/ETH price normalized to 1e18 (wei per token)
    /// @param tokenUsd The TOKEN/USD price from Pyth
    /// @param ethUsd The ETH/USD price from Pyth
    /// @return ratio The TOKEN/ETH price in wei (1e18 = 1 ETH per token)
    function _calculateRatio(PythStructs.Price memory tokenUsd, PythStructs.Price memory ethUsd)
        internal
        pure
        returns (uint256 ratio)
    {
        // Convert prices to uint256 for safe math
        uint256 tokenPrice = uint256(uint64(tokenUsd.price));
        uint256 ethPrice = uint256(uint64(ethUsd.price));

        // Calculate the combined exponent difference
        // We want result in 1e18 scale (wei)
        // ratio = (tokenPrice / ethPrice) * 10^(tokenExpo - ethExpo + 18)
        int32 exponentDiff = tokenUsd.expo - ethUsd.expo;

        // Base ratio
        uint256 baseRatio = (tokenPrice * 1e18) / ethPrice;

        // Apply exponent adjustment
        if (exponentDiff == 0) {
            return baseRatio;
        } else if (exponentDiff > 0) {
            // Token has larger exponent, multiply
            return baseRatio * (10 ** uint32(exponentDiff));
        } else {
            // Token has smaller exponent, divide
            return baseRatio / (10 ** uint32(-exponentDiff));
        }
    }
}
