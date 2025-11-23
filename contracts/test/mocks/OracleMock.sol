// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.26;

import {IOracle} from "../../contracts/interfaces/IOracle.sol";

contract OracleMock is IOracle {
    mapping(bytes32 => uint256) private _tokenPriceInEth;

    function setTokenPriceInEth(bytes32 tokenFeedId, uint256 tokenPriceInEth) external {
        _tokenPriceInEth[tokenFeedId] = tokenPriceInEth;
    }

    function getTokenPriceInEth(bytes32 tokenFeedId) external view returns (uint256 price) {
        return _tokenPriceInEth[tokenFeedId];
    }
}
