// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.26;

import {IOracle} from "../../contracts/interfaces/IOracle.sol";

contract OracleMock is IOracle {

    mapping(address => uint256) private _tokenPriceInEth;

    function setTokenPriceInEth(address token, uint256 tokenPriceInEth) external {
        _tokenPriceInEth[token] = tokenPriceInEth;
    }

    function getTokenPriceInEth(address token) external view returns (uint256 price) {
        return _tokenPriceInEth[token];
    }
}
