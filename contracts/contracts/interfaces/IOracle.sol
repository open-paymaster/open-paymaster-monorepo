// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
/// @title IOracle
/// @notice Interface for the Oracle contract
interface IOracle {
    /// @notice Returns the price of the token in ETH
    /// @param token The address of the token to get the price of
    /// @return priceInEth The price of the token in ETH
    function getTokenPriceInEth(address token) external view returns (uint256 priceInEth);
}
