// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.26;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

/// @dev Mock implementation of IPyth for testing
contract PythMock is IPyth {
    mapping(bytes32 => PythStructs.Price) private _prices;

    /// @dev Set a mock price for a given feed ID
    function setPrice(bytes32 id, int64 price, uint64 conf, int32 expo, uint256 publishTime) external {
        _prices[id] = PythStructs.Price({price: price, conf: conf, expo: expo, publishTime: publishTime});
    }

    /// @dev Helper to set price with common defaults
    function setPrice(bytes32 id, int64 price, int32 expo) external {
        _prices[id] = PythStructs.Price({price: price, conf: 0, expo: expo, publishTime: block.timestamp});
    }

    function getPriceUnsafe(bytes32 id) external view override returns (PythStructs.Price memory price) {
        return _prices[id];
    }

    function getPriceNoOlderThan(bytes32 id, uint256) external view override returns (PythStructs.Price memory price) {
        return _prices[id];
    }

    function getEmaPrice(bytes32 id) external view returns (PythStructs.Price memory price) {
        return _prices[id];
    }

    function getEmaPriceUnsafe(bytes32 id) external view returns (PythStructs.Price memory price) {
        return _prices[id];
    }

    function getEmaPriceNoOlderThan(bytes32 id, uint256) external view returns (PythStructs.Price memory price) {
        return _prices[id];
    }

    function getUpdateFee(bytes[] calldata) external pure override returns (uint256) {
        return 0; // Free updates for testing (in production this costs ~1 wei per feed)
    }

    function updatePriceFeeds(bytes[] calldata) external payable override {
        // No-op for mock
    }

    function updatePriceFeedsIfNecessary(bytes[] calldata, bytes32[] calldata, uint64[] calldata)
        external
        payable
        override
    {
        // No-op for mock
    }

    function parsePriceFeedUpdates(bytes[] calldata, bytes32[] calldata, uint64, uint64)
        external
        payable
        override
        returns (PythStructs.PriceFeed[] memory)
    {
        return new PythStructs.PriceFeed[](0);
    }

    function parsePriceFeedUpdatesUnique(bytes[] calldata, bytes32[] calldata, uint64, uint64)
        external
        payable
        override
        returns (PythStructs.PriceFeed[] memory)
    {
        return new PythStructs.PriceFeed[](0);
    }

    function getTwapUpdateFee(bytes[] calldata) external pure override returns (uint256 feeAmount) {
        return 1;
    }

    function parsePriceFeedUpdatesWithConfig(bytes[] calldata, bytes32[] calldata, uint64, uint64, bool, bool, bool)
        external
        payable
        returns (PythStructs.PriceFeed[] memory, uint64[] memory)
    {
        return (new PythStructs.PriceFeed[](0), new uint64[](0));
    }

    function parseTwapPriceFeedUpdates(bytes[] calldata, bytes32[] calldata)
        external
        payable
        returns (PythStructs.TwapPriceFeed[] memory)
    {
        return new PythStructs.TwapPriceFeed[](0);
    }

    function getValidTimePeriod() external pure returns (uint256) {
        return 60;
    }
}

