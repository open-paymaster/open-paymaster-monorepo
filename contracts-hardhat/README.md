# Universal Paymaster Smart Contracts

This directory contains the smart contracts for the Universal Paymaster protocol - an ERC-4337 account abstraction paymaster system that sponsors blockchain transactions.

## Overview

The Universal Paymaster implements the ERC-4337 standard to enable gasless transactions by sponsoring user operations. The system validates and pays for transactions on behalf of users, with extensible logic for determining which operations to sponsor.

## Implemented Contracts

### BasePaymaster

**Location:** [`contracts/core/BasePaymaster.sol`](contracts/core/BasePaymaster.sol)

An abstract base contract implementing the ERC-4337 `IPaymaster` interface. Provides core validation and post-operation logic that must be extended by concrete paymaster implementations.

**Key Features:**
- ERC-4337 compliant paymaster implementation
- Integration with canonical EntryPoint v0.8
- Entry point access control via `onlyEntryPoint` modifier
- Extensible validation and post-op hooks
- OpenZeppelin ERC-4337 utilities integration

## Architecture

### ERC-4337 Flow

```
┌──────────────┐
│     User     │
└──────┬───────┘
       │
       │ 1. Create UserOperation
       ▼
┌──────────────────────┐
│    Entry Point       │
│   (ERC4337Utils)     │
└──────┬───────────────┘
       │
       │ 2. validatePaymasterUserOp()
       ▼
┌──────────────────────┐      ┌────────────────────────┐
│   BasePaymaster      │◄─────│  Concrete Paymaster    │
│                      │      │  Implementation        │
│ • Entry point check  │      │ • Custom validation    │
│ • Validation hook    │      │ • Sponsorship logic    │
│ • Post-op hook       │      │ • Fee handling         │
└──────┬───────────────┘      └────────────────────────┘
       │
       │ 3. Execute transaction
       ▼
┌──────────────────────┐
│   Smart Wallet       │
│   (User Account)     │
└──────────────────────┘
       │
       │ 4. postOp() [if needed]
       ▼
┌──────────────────────┐
│   BasePaymaster      │
│   • Refund logic     │
│   • State updates    │
└──────────────────────┘
```

## BasePaymaster Contract

### Public Functions

#### `entryPoint() → IEntryPoint`

Returns the canonical ERC-4337 entry point contract (v0.8) that validates user operations.

**Returns:** The entry point contract instance

**Access:** Public view

```solidity
function entryPoint() public view virtual returns (IEntryPoint) {
    return ERC4337Utils.ENTRYPOINT_V08;
}
```

#### `validatePaymasterUserOp(userOp, userOpHash, maxCost) → (context, validationData)`

Called by the entry point to validate whether the paymaster will sponsor a user operation.

**Parameters:**
- `userOp` (`PackedUserOperation`) - The user operation to validate
- `userOpHash` (`bytes32`) - Hash of the user operation
- `maxCost` (`uint256`) - Maximum cost in native tokens that may be charged

**Returns:**
- `context` (`bytes`) - Data passed to `postOp` for post-execution logic
- `validationData` (`uint256`) - Encoded validation result (0 = success, 1 = failure)

**Access:** Public (entry point only)

**Flow:**
```
   EntryPoint              BasePaymaster           Concrete Implementation
       │                         │                           │
       │  validatePaymaster...() │                           │
       ├────────────────────────►│                           │
       │                         │  onlyEntryPoint check     │
       │                         │                           │
       │                         │  _validatePaymaster...()  │
       │                         ├──────────────────────────►│
       │                         │                           │
       │                         │  ✓ Custom validation      │
       │                         │  ✓ Sponsorship decision   │
       │                         │◄──────────────────────────│
       │  (context, validation)  │                           │
       │◄────────────────────────│                           │
```

#### `postOp(mode, context, actualGasCost, actualUserOpFeePerGas)`

Post-operation hook called by the entry point after the user operation executes.

**Parameters:**
- `mode` (`PostOpMode`) - Indicates if the operation succeeded, reverted, or was prefund-only
- `context` (`bytes`) - Context data from `validatePaymasterUserOp`
- `actualGasCost` (`uint256`) - Actual gas cost paid in native tokens
- `actualUserOpFeePerGas` (`uint256`) - Effective gas price for this user operation

**Access:** Public (entry point only)

**Note:** Only called if validation returned non-empty context.

```
   EntryPoint              BasePaymaster           Concrete Implementation
       │                         │                           │
       │  After UserOp executed  │                           │
       │                         │                           │
       │  postOp()               │                           │
       ├────────────────────────►│                           │
       │                         │  onlyEntryPoint check     │
       │                         │                           │
       │                         │  _postOp()                │
       │                         ├──────────────────────────►│
       │                         │                           │
       │                         │  ✓ Refund logic           │
       │                         │  ✓ State updates          │
       │                         │◄──────────────────────────│
       │  ✓ Complete             │                           │
       │◄────────────────────────│                           │
```

### Internal/Abstract Functions

#### `_validatePaymasterUserOp(userOp, userOpHash, requiredPreFund) → (context, validationData)`

**Abstract function** that must be implemented by concrete paymaster contracts.

**Purpose:** Determine if the paymaster will sponsor the user operation and return context for post-op logic.

**Parameters:**
- `userOp` - The user operation being validated
- `userOpHash` - Hash of the user operation
- `requiredPreFund` - Amount of native tokens required to be prefunded

**Important Notes:**
- `requiredPreFund` = `requiredGas × userOp.maxFeePerGas`
- `requiredGas` includes: `verificationGasLimit + callGasLimit + paymasterVerificationGasLimit + paymasterPostOpGasLimit + preVerificationGas`

**Returns:**
- `context` - Data to pass to `_postOp`
- `validationData` - 0 for success, 1 for failure, or time range encoding

#### `_postOp(mode, context, actualGasCost, actualUserOpFeePerGas)`

**Virtual function** that can be overridden to implement post-operation logic.

**Purpose:** Handle refunds, state updates, or accounting after user operation execution.

**Important Notes:**
- `actualUserOpFeePerGas` ≠ `tx.gasprice` (user ops can be bundled)
- Only called if validation returned non-empty context
- Default implementation is a no-op

### Access Control

#### `onlyEntryPoint` Modifier

Restricts function access to the canonical entry point contract only.

**Usage:**
```solidity
function validatePaymasterUserOp(...) public onlyEntryPoint returns (...) {
    // Only EntryPoint can call this
}
```

**Error:** `PaymasterUnauthorized(address sender)` - Thrown when caller is not the entry point

## Extending BasePaymaster

To create a concrete paymaster implementation:

1. **Inherit from BasePaymaster**
   ```solidity
   contract MyPaymaster is BasePaymaster {
       // Implementation
   }
   ```

2. **Implement `_validatePaymasterUserOp`**
   ```solidity
   function _validatePaymasterUserOp(
       PackedUserOperation calldata userOp,
       bytes32 userOpHash,
       uint256 requiredPreFund
   ) internal override returns (bytes memory context, uint256 validationData) {
       // Custom validation logic
       // Check if operation should be sponsored
       // Return context and validation result
   }
   ```

3. **Optionally override `_postOp`**
   ```solidity
   function _postOp(
       PostOpMode mode,
       bytes calldata context,
       uint256 actualGasCost,
       uint256 actualUserOpFeePerGas
   ) internal override {
       // Custom post-op logic
       // Handle refunds, update state, etc.
   }
   ```

## Dependencies

- **OpenZeppelin Contracts v5.4.0**
  - `@openzeppelin/contracts/account/utils/draft-ERC4337Utils.sol` - Entry point utilities
  - `@openzeppelin/contracts/interfaces/draft-IERC4337.sol` - ERC-4337 interfaces

- **Account Abstraction**
  - `@eth-infinitism/account-abstraction` - Canonical ERC-4337 implementation

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm

### Installation

```bash
cd contracts
pnpm install
```

### Build

```bash
pnpm build
```

This compiles all Solidity contracts using Hardhat.

### Testing

```bash
# Run all tests
pnpm test

# Run Solidity tests only
npx hardhat test solidity

# Run Node.js integration tests
npx hardhat test nodejs
```

### Linting

```bash
pnpm lint
```

This runs:
- Prettier on TypeScript, JavaScript, JSON, and Markdown files
- Prettier on Solidity files with `prettier-plugin-solidity`
- Solhint on Solidity files for style and security checks

### Deployment

#### Local Development

```bash
npx hardhat ignition deploy ignition/modules/Counter.ts
```

#### Sepolia Testnet

```bash
# Set configuration variables
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
npx hardhat keystore set SEPOLIA_RPC_URL

# Deploy
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
```

## Network Configuration

See [`hardhat.config.ts`](./hardhat.config.ts) for network configurations:

- **hardhatMainnet**: Simulated L1 chain for testing
- **hardhatOp**: Simulated Optimism L2 chain (supports OP-specific features like L1 gas estimation)
- **sepolia**: Ethereum Sepolia testnet

## Project Structure

```
contracts/
├── contracts/
│   └── core/
│       └── BasePaymaster.sol       # Abstract ERC-4337 paymaster base
├── ignition/
│   └── modules/                    # Hardhat Ignition deployment modules
├── scripts/
│   └── send-op-tx.ts              # Example OP mainnet transaction script
├── hardhat.config.ts              # Hardhat 3 configuration
├── package.json                   # Dependencies and scripts
├── .prettierrc.json              # Prettier configuration
├── .solhint.json                 # Solhint linter rules
└── tsconfig.json                 # TypeScript configuration
```

## Security Considerations

1. **Entry Point Trust**: The paymaster trusts the canonical entry point contract completely. Only the entry point should call `validatePaymasterUserOp` and `postOp`.

2. **Prefund Calculation**: Carefully validate that `requiredPreFund` is sufficient before approving operations. Insufficient prefunding will cause the operation to fail.

3. **Gas Price Handling**: Remember that `actualUserOpFeePerGas` in `postOp` may differ from `tx.gasprice` due to operation bundling.

4. **Context Data**: Context returned from validation is passed to `postOp`. Ensure it contains all necessary data and cannot be manipulated.

5. **Reentrancy**: Consider reentrancy risks in `_postOp` implementations, especially when making external calls.

## Frontend Integration

The frontend integrates with paymaster contracts through Viem. See [`frontend/lib/sc-actions.ts`](../frontend/lib/sc-actions.ts) for integration examples.

Contract ABIs are defined in [`frontend/lib/abi/`](../frontend/lib/abi/).

## Resources

- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
- [OpenZeppelin ERC-4337 Docs](https://docs.openzeppelin.com/contracts/5.x/api/account)
- [Hardhat 3 Documentation](https://hardhat.org/docs)
- [Account Abstraction by eth-infinitism](https://github.com/eth-infinitism/account-abstraction)

## License

[Add your license here]
