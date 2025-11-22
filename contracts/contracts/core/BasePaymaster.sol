// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import {ERC4337Utils} from "@openzeppelin/contracts/account/utils/draft-ERC4337Utils.sol";
import {IEntryPoint, IPaymaster, PackedUserOperation} from "@openzeppelin/contracts/interfaces/draft-IERC4337.sol";

/**
 * @dev Minimal paymaster base contract implementing the ERC-4337 paymaster interface. Provides core validation
 * and post-operation logic that must be extended by concrete implementations.
 */
abstract contract BasePaymaster is IPaymaster {
    /* @dev Unauthorized call to the paymaster. */
    error PaymasterUnauthorized(address sender);

    /* @dev Revert if the caller is not the entry point. */
    modifier onlyEntryPoint() {
        _checkEntryPoint();
        _;
    }

    /* @dev Returns the canonical ERC-4337 entry point contract that validates user operations. */
    function entryPoint() public view virtual returns (IEntryPoint) {
        return ERC4337Utils.ENTRYPOINT_V08;
    }

    /* @inheritdoc IPaymaster */
    function validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) public virtual onlyEntryPoint returns (bytes memory context, uint256 validationData) {
        return _validatePaymasterUserOp(userOp, userOpHash, maxCost);
    }

    /* @inheritdoc IPaymaster */
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost,
        uint256 actualUserOpFeePerGas
    ) public virtual onlyEntryPoint {
        _postOp(mode, context, actualGasCost, actualUserOpFeePerGas);
    }

    /**
     * @dev Internal validation logic to determine if the paymaster will sponsor the user operation.
     * Implementations must return context data for {_postOp} and validation data encoding approval or rejection.
     *
     * NOTE: The `requiredPreFund` is the amount the paymaster must prefund in native tokens, calculated as
     * `requiredGas * userOp.maxFeePerGas`, where required gas includes verificationGasLimit + callGasLimit +
     * paymasterVerificationGasLimit + paymasterPostOpGasLimit + preVerificationGas.
     *
     * @param userOp The user operation being validated.
     * @param userOpHash The hash of the user operation.
     * @param requiredPreFund The amount of native tokens required to be prefunded.
     * @return context Data to be passed to {_postOp} for post-execution logic.
     * @return validationData Encoded validation result (0 for success, 1 for failure, or timeRange encoding).
     */
    function _validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 requiredPreFund
    ) internal virtual returns (bytes memory context, uint256 validationData);

    /**
     * @dev Hook called after the user operation executes, receiving the context from {_validatePaymasterUserOp}.
     * Only invoked if validation returned non-empty context. Override to implement refund logic or state updates.
     *
     * NOTE: The `actualUserOpFeePerGas` is not equivalent to `tx.gasprice` because user operations can be bundled
     * with other transactions, causing the effective gas price to differ from the transaction's gas price.
     *
     * @param mode Indicates whether the user operation succeeded, reverted, or was a prefund-only operation.
     * @param context The context bytes returned from {_validatePaymasterUserOp}.
     * @param actualGasCost The actual gas cost paid by the paymaster in native tokens.
     * @param actualUserOpFeePerGas The effective gas price used for this specific user operation.
     */
    function _postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost,
        uint256 actualUserOpFeePerGas
    ) internal virtual {}

    /* @dev Reverts if the caller is not the {entryPoint}. Used by the {onlyEntryPoint} modifier. */
    function _checkEntryPoint() internal view virtual {
        if (msg.sender != address(entryPoint())) {
            revert PaymasterUnauthorized(msg.sender);
        }
    }
}
