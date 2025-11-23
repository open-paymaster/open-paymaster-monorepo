// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.5.0
pragma solidity ^0.8.27;

import {IAccount, PackedUserOperation} from "@openzeppelin/contracts/interfaces/draft-IERC4337.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {console} from "forge-std/console.sol";

contract SimpleAccountECDSAMock is IAccount {
    using ECDSA for bytes32;

    address public immutable entryPoint;
    address public owner;
    uint256 private _nonce;

    constructor(address _owner, address _entryPoint) {
        entryPoint = _entryPoint;
        owner = _owner;
    }

    modifier onlyEntryPoint() {
        require(msg.sender == entryPoint, "only EntryPoint");
        _;
    }

    modifier onlyEntryPointOrSelf() {
        require(msg.sender == entryPoint || msg.sender == address(this), "only EntryPoint or self");
        _;
    }

    function validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash, uint256)
        external
        onlyEntryPoint
        returns (uint256 validationData)
    {
        console.log("validateUserOp called");
        console.log("userOpHash:");
        console.logBytes32(userOpHash);
        console.log("Owner:", owner);
        
        // Recover the signer from the signature
        // Note: UserOpHash is already hashed by the EntryPoint, so we don't double-hash it
        address recovered = userOpHash.recover(userOp.signature);
        console.log("Recovered:", recovered);
        
        if (recovered != owner) {
            console.log("Signature validation FAILED");
            return 1; // SIG_VALIDATION_FAILED
        }
        
        console.log("Signature validation SUCCEEDED");
        return 0; // SIG_VALIDATION_SUCCEEDED
    }

    function execute(address target, uint256 value, bytes calldata data) external onlyEntryPointOrSelf {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    function getNonce() external view returns (uint256) {
        return _nonce;
    }

    receive() external payable {}
}