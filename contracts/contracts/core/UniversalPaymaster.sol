// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

// External
import {
    ERC4337Utils,
    PackedUserOperation
} from "@openzeppelin/contracts/account/utils/draft-ERC4337Utils.sol";
import {IEntryPoint} from "@openzeppelin/contracts/interfaces/draft-IERC4337.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
// Internal
import {BasePaymaster} from "./BasePaymaster.sol";
import {EntryPointVault} from "./EntryPointVault.sol";
import {IOracle} from "../interfaces/IOracle.sol";

/// @title UniversalPaymaster
/// @notice A trustless paymaster that allows users to pay for gas with any token.
contract UniversalPaymaster is BasePaymaster, EntryPointVault {
    using ERC4337Utils for PackedUserOperation;
    using SafeERC20 for IERC20;
    using Math for *;

    struct Pool {
        // the token address that the pool accepts as gas payment
        address token;
        // the oracle address that provides the token price
        address oracle;
        // the pool LP fee expressed in basis points (bps)
        // i.e: 100 bps = 1%
        uint24 lpFeeBps;
        // the pool rebalancing fee expressed in basis points (bps)
        // i.e: 100 bps = 1%
        //
        // @TODO: the pool fee should be a relationship between the token reserves and the eth reserves.
        // A kind of bounding curve must be implemented where:
        // When ethReserves are zero, the fee is maximum (e.g 2%)
        // When tokenReserves are zero, the fee is minimum (e.g 0%)
        uint24 rebalancingFeeBps;
    }

    // emitted when a new pool is initialized
    event PoolInitialized(address token, address oracle, uint24 lpFeeBps, uint24 rebalancingFeeBps);

    // emitted when a pool is rebalanced
    event PoolRebalanced(address token, uint256 ethAmount, uint256 tokenAmount);

    // thrown when a pool is already initialized
    error PoolAlreadyInitialized(address token);

    // thrown when a pool is not initialized
    error PoolNotInitialized(address token);

    // thrown when a pool does not have enough eth reserves
    error PoolNotEnoughEthReserves(uint256 ethRequired);

    // thrown when a pool does not have enough token reserves
    error PoolNotEnoughTokenReserves(uint256 tokensRequired);

    // thrown when an invalid oracle is provided
    error InvalidOracle(address oracle);

    // thrown when an invalid pool fee configuration is provided
    error InvalidPoolFeeBps(uint24 lpFeeBps, uint24 rebalancingFeeBps);

    // thrown when not enough eth is sent
    error NotEnoughEthSent(uint256 ethSent, uint256 ethRequired);

    // thrown when an invalid amount is provided
    error InvalidAmount(uint256 amount);

    // registry of initialized `pool` for a given `token`
    mapping(address token => Pool pool) public pools;

    // initializes a new pool for a given `token`, `lpFeeBps`, `rebalancingFeeBps` and `oracle`
    // NOTE: In the current version, only one pool can be initialized for a given `token`.
    // @TODO: allow multiple pools for a given `token` with different `lpFeeBps` and `rebalancingFeeBps`.
    function initializePool(
        address token,
        uint24 lpFeeBps,
        uint24 rebalancingFeeBps,
        address oracle
    ) public {
        require(pools[token].oracle == address(0), PoolAlreadyInitialized(token));
        require(oracle != address(0), InvalidOracle(oracle));
        require(
            lpFeeBps >= 0 && rebalancingFeeBps >= 0 && lpFeeBps + rebalancingFeeBps <= 10000,
            InvalidPoolFeeBps(lpFeeBps, rebalancingFeeBps)
        );

        pools[token].token = token;
        pools[token].oracle = oracle;
        pools[token].lpFeeBps = lpFeeBps;
        pools[token].rebalancingFeeBps = rebalancingFeeBps;

        emit PoolInitialized(token, oracle, lpFeeBps, rebalancingFeeBps);
    }

    function _validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32,
        uint256 maxCost
    ) internal virtual override returns (bytes memory context, uint256 validationData) {
        // decode the token from the paymaster data
        (address token) = abi.decode(userOp.paymasterData(), (address));

        // verify the pool is initialized
        Pool memory pool = pools[token];
        require(pool.oracle != address(0), PoolNotInitialized(token));

        // verify the pool has enough eth reserves to cover the gas cost
        require(getPoolEthReserves(token) >= maxCost, PoolNotEnoughEthReserves(maxCost));

        // query the token price from oracle
        uint256 tokenPriceInEth = IOracle(pool.oracle).getTokenPriceInEth(token);

        // query the fees in basis points for the token pool
        uint24 feesBps = pool.lpFeeBps + pool.rebalancingFeeBps;

        // calculate the prefund amount
        uint256 gasCost = _gasCost(maxCost, userOp.maxFeePerGas());
        uint256 prefund = _erc20Cost(gasCost, tokenPriceInEth, feesBps);

        // attempt to make the user to pay the prefund amount to this paymaster
        bool prefunded = IERC20(token).trySafeTransferFrom(userOp.sender, address(this), prefund);

        // if the prefund payment failed, fail the validation
        if (!prefunded) return (bytes(""), ERC4337Utils.SIG_VALIDATION_FAILED);

        // 9. encode the context for the `postOp` function
        context = abi.encode(userOp.sender, token, tokenPriceInEth, feesBps, prefund);

        return (context, validationData);
    }

    function _postOp(
        PostOpMode,
        bytes calldata context,
        uint256 actualGasCost,
        uint256 actualUserOpFeePerGas
    ) internal virtual override {
        // 1. decode the context for the `postOp` function
        (address sender, address token, uint256 tokenPriceInEth, uint256 feesBps, uint256 prefund) =
            abi.decode(context, (address, address, uint256, uint256, uint256));

        // 2. convert from gas amount to token amount
        uint256 actualGasCostInEth = _gasCost(actualGasCost, actualUserOpFeePerGas);
        uint256 actualTokenAmount = _erc20Cost(actualGasCostInEth, tokenPriceInEth, feesBps);

        // 2. transfer the excess token amount to the user
        uint256 excessTokenAmount = prefund - actualTokenAmount;
        if (excessTokenAmount > 0) IERC20(token).safeTransfer(sender, excessTokenAmount);

        // track the gas spent in the token pool
        // @TODO: there is a potential issue here that must be improved:
        // We are approximating `actualGasCostInEth` by approximating `postOpCost`, which is unknown at this point in runtime,
        // and therefore the deltaError may unsynchonize the assets of the token pool, by making the paymaster think this 
        // userOp decreased the deposited eth by more or less than it did, messing accountability by small deltas at a time.
        _decreaseAssets(uint256(uint160(token)), actualGasCostInEth);
    }

    /// @dev Calculates the cost of the user operation in ETH.
    /// @param gasCost The cost of the user operation in ETH.
    /// @param tokenPrice The price of the token in ETH (Wei per token)
    /// @param feesBps The fees in basis points. i.e 100bps = 1%
    /// @return erc20CostWithFees The cost of the user operation in the token, including fees.
    function _erc20Cost(uint256 gasCost, uint256 tokenPrice, uint256 feesBps)
        internal
        view
        virtual
        returns (uint256 erc20CostWithFees)
    {
        uint256 baseErc20Cost = gasCost.mulDiv(tokenPrice, _tokenPriceDenominator());
        erc20CostWithFees = baseErc20Cost + (baseErc20Cost * feesBps / 10000);
    }

    function _gasCost(uint256 cost, uint256 feePerGas)
        internal
        view
        virtual
        returns (uint256 gasCost)
    {
        return (cost + _postOpCost() * feePerGas);
    }

    /// @dev Denominator used for interpreting the `tokenPrice` returned by {_fetchDetails} 
    // as "fixed point" in {_erc20Cost}.
    function _tokenPriceDenominator() internal view virtual returns (uint256) {
        return 1e18;
    }

    /// @dev Over-estimates the cost of the post-operation logic
    function _postOpCost() internal pure returns (uint256) {
        return 20_000;
    }

    // allows any permissionless `rebalancer` to rebalance the pool by buying tokens with eth
    // at a discount price of `rebalancingFeeBps` basis points, an economic incentive paid by 
    // the users to the rebalancers to keep the pools balanced and healthy.
    function rebalance(address token, uint256 tokenAmount, address receiver)
        public
        payable
        returns (uint256 ethAmountAfterDiscount)
    {
        require(tokenAmount > 0, InvalidAmount(tokenAmount));

        // get the oracle and validate the pool exists
        Pool memory pool = pools[token];
        require(pool.oracle != address(0), PoolNotInitialized(token));

        // validate the pool has enough tokenAmount to sell
        require(getPoolTokenReserves(token) >= tokenAmount, PoolNotEnoughTokenReserves(tokenAmount));

        // query the token price from oracle
        uint256 tokenPriceInEth = IOracle(pool.oracle).getTokenPriceInEth(token);

        // calculate the required eth amount for buying the token amount
        uint256 ethAmount = tokenAmount * tokenPriceInEth / 1e18;

        // calculate the eth amount after the rebalancing discount
        ethAmountAfterDiscount = ethAmount - (ethAmount * pool.rebalancingFeeBps / 10000);

        // validate the msg.value amount is enough to cover the eth amount after the rebalancing discount
        require(
            msg.value >= ethAmountAfterDiscount, NotEnoughEthSent(msg.value, ethAmountAfterDiscount)
        );

        // track the eth added to the pool for the shares accountability
        _increaseAssets(uint256(uint160(token)), ethAmountAfterDiscount);

        // put the eth into the entrypoint
        entryPoint().depositTo{value: ethAmountAfterDiscount}(address(this));

        // send the bought tokens to the receiver
        IERC20(token).safeTransfer(receiver, tokenAmount);

        // send back any excess eth to the rebalancer
        uint256 excessEth = msg.value - ethAmountAfterDiscount;
        if (excessEth > 0) payable(msg.sender).transfer(excessEth);

        emit PoolRebalanced(token, ethAmountAfterDiscount, tokenAmount);
    }

    // returns the current eth reserves for a given token pool
    function getPoolEthReserves(address token) public view returns (uint256 ethReserves) {
        return totalAssets(uint256(uint160(token)));
    }

    // returns the current token reserves for a given token pool
    function getPoolTokenReserves(address token) public view returns (uint256 tokenReserves) {
        return IERC20(token).balanceOf(address(this));
    }

    // required override by Solidity
    // returns the entryPoint defined by the `BasePaymaster` contract.
    function entryPoint()
        public
        view
        virtual
        override(BasePaymaster, EntryPointVault)
        returns (IEntryPoint)
    {
        return super.entryPoint();
    }
}
