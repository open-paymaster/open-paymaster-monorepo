// SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

import {ERC6909TokenSupply} from "@openzeppelin/contracts/token/ERC6909/extensions/ERC6909TokenSupply.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

abstract contract ERC6909NativeVault is ERC6909TokenSupply {
    using Math for uint256;

    /* @dev Total amount of ETH for a particular ID token. */
    mapping(uint256 id => uint256) private _assets;

    event Deposit(address indexed caller, address indexed receiver, uint256 assets, uint256 shares, uint256 id);

    event Withdraw(
        address indexed caller,
        address indexed receiver,
        address indexed owner,
        uint256 assets,
        uint256 shares,
        uint256 id
    );

    error ERC6909NativeVaultExceededMaxDeposit(address receiver, uint256 assets, uint256 max, uint256 id);

    error ERC6909NativeVaultExceededMaxMint(address receiver, uint256 shares, uint256 max, uint256 id);

    error ERC6909NativeVaultExceededMaxWithdraw(address owner, uint256 assets, uint256 max, uint256 id);

    error ERC6909NativeVaultExceededMaxRedeem(address owner, uint256 shares, uint256 max, uint256 id);

    error ERC6909NativeVaultInvalidNativeAmount(uint256 assets, uint256 value);

    error ERC6909NativeVaultWithdrawFailed(address receiver, uint256 assets);

    /* @dev Returns the total amount of ETH assets for a particular token ID pool. */
    function totalAssets(uint256 id) public view virtual returns (uint256) {
        return _assets[id];
    }

    function maxDeposit(address /* receiver */, uint256 /* id */) public view virtual returns (uint256) {
        return type(uint256).max;
    }

    function maxMint(address /* receiver */, uint256 /* id */) public view virtual returns (uint256) {
        return type(uint256).max;
    }

    function maxWithdraw(address owner, uint256 id) public view virtual returns (uint256) {
        return previewRedeem(maxRedeem(owner, id), id);
    }

    function maxRedeem(address owner, uint256 id) public view virtual returns (uint256) {
        return balanceOf(owner, id);
    }

    function previewDeposit(uint256 assets, uint256 id) public view virtual returns (uint256) {
        return _convertToShares(assets, id, Math.Rounding.Floor);
    }

    function previewMint(uint256 shares, uint256 id) public view virtual returns (uint256) {
        return _convertToAssets(shares, id, Math.Rounding.Ceil);
    }

    function previewWithdraw(uint256 assets, uint256 id) public view virtual returns (uint256) {
        return _convertToShares(assets, id, Math.Rounding.Ceil);
    }

    function previewRedeem(uint256 shares, uint256 id) public view virtual returns (uint256) {
        return _convertToAssets(shares, id, Math.Rounding.Floor);
    }

    /* deposits ETH into the vault and mints ERC-6909 shares */
    function deposit(uint256 assets, address receiver, uint256 id) public payable virtual returns (uint256) {
        if (assets != msg.value) {
            revert ERC6909NativeVaultInvalidNativeAmount(assets, msg.value);
        }

        uint256 maxAssets = maxDeposit(receiver, id);
        if (assets > maxAssets) {
            revert ERC6909NativeVaultExceededMaxDeposit(receiver, assets, maxAssets, id);
        }

        uint256 shares = previewDeposit(assets, id);
        _deposit(_msgSender(), receiver, assets, shares, id);

        return shares;
    }

    /* withdraws ETH from the vault and burns ERC-6909 shares */
    function withdraw(uint256 assets, address receiver, address owner, uint256 id) public virtual returns (uint256) {
        uint256 maxAssets = maxWithdraw(owner, id);
        if (assets > maxAssets) {
            revert ERC6909NativeVaultExceededMaxWithdraw(owner, assets, maxAssets, id);
        }

        uint256 shares = previewWithdraw(assets, id);
        _withdraw(_msgSender(), receiver, owner, assets, shares, id);

        return shares;
    }

    /**
     * @dev Internal conversion function (from assets to shares) with support for rounding direction.
     *
     * NOTE: Uses virtual shares (1 wei) to mitigate inflation attacks on empty pools.
     */
    function _convertToShares(
        uint256 assets,
        uint256 id,
        Math.Rounding rounding
    ) internal view virtual returns (uint256) {
        return assets.mulDiv(totalSupply(id) + 1, totalAssets(id) + 1, rounding);
    }

    /**
     * @dev Internal conversion function (from shares to assets) with support for rounding direction.
     *
     * NOTE: Uses virtual shares (1 wei) to mitigate inflation attacks on empty pools.
     */
    function _convertToAssets(
        uint256 shares,
        uint256 id,
        Math.Rounding rounding
    ) internal view virtual returns (uint256) {
        return shares.mulDiv(totalAssets(id) + 1, totalSupply(id) + 1, rounding);
    }

    /**
     * @dev Deposit/mint common workflow.
     *
     * NOTE: ETH is already received via `msg.value` in `deposit`, so we only need to track it.
     */
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares, uint256 id) internal virtual {
        _increaseAssets(id, assets);
        _mint(receiver, id, shares);

        emit Deposit(caller, receiver, assets, shares, id);
    }

    /**
     * @dev Withdraw/redeem common workflow.
     *
     * IMPORTANT: this function should be overridden and extended to send ETH to the receiver.
     */
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares,
        uint256 id
    ) internal virtual {
        if (caller != owner) {
            _spendAllowance(owner, caller, id, shares);
        }

        _burn(owner, id, shares);
        _decreaseAssets(id, assets);

        emit Withdraw(caller, receiver, owner, assets, shares, id);
    }

    /* increases the total amount of ETH assets for a particular token ID pool */
    function _increaseAssets(uint256 id, uint256 amount) internal virtual {
        _assets[id] += amount;
    }

    /* decreases the total amount of ETH assets for a particular token ID pool */
    function _decreaseAssets(uint256 id, uint256 amount) internal virtual {
        _assets[id] -= amount;
    }
}
