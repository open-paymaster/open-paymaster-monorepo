// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice A mock ERC20 token for testing purposes whose decimals are defined at construction time.
contract ERC20Mock is ERC20 {

    uint256 private _decimals;

    constructor(uint256 decimals_) ERC20("Mock Token", "MTK") {
        _decimals = decimals_;
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function decimals() public view override returns (uint8) {
        return uint8(_decimals);
    }
}
