// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import {ERC6909NativeVault} from "./ERC6909NativeVault.sol";
import {IEntryPoint} from "@openzeppelin/contracts/interfaces/draft-IERC4337.sol";

abstract contract EntryPointVault is ERC6909NativeVault {
    /* @dev Returns the entry point contract instance. */
    function entryPoint() public view virtual returns (IEntryPoint);

    /* deposits to the entry point and mints ERC-6909 shares*/
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares, uint256 id) internal override {
        super._deposit(caller, receiver, assets, shares, id);
        entryPoint().depositTo{value: assets}(address(this));
    }

    /* withdraws from the entry point and burn ERC-6909 shares*/
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares,
        uint256 id
    ) internal override {
        super._withdraw(caller, receiver, owner, assets, shares, id);
        entryPoint().withdrawTo(payable(receiver), assets);
    }
}
