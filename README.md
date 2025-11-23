# Open Paymaster

A decentralized, trustless paymaster built on ERC-4337 that enables gasless blockchain transactions through community-funded liquidity pools.

## The Problem

Users face three fundamental barriers when using Ethereum-compatible networks:

1. **The Gas Paradox**: Having tokens but being unable to use them due to lack of native currency for gas
2. **Acquisition Friction**: Getting gas requires bridging funds or using centralized exchanges with KYC
3. **Complexity Barrier**: End users shouldn't need to understand gas—it's an implementation detail that should be abstracted away

### Why Centralized Paymasters Don't Solve This

- **Trust dependency**: Users rely on third parties to maintain operations and liquidity
- **Liveness risk**: No guarantee the service will stay operational or funded
- **High fees**: Typically charge 10%+ markup on gas costs

## The Solution

**Open Paymaster** enables users to pay transaction fees with any supported ERC-20 token. Liquidity providers earn yield on native ETH deposits, while users get seamless access without ever touching gas tokens.

### How It Works

The paymaster operates through:

- **Community-funded liquidity pools**: LPs deposit native ETH and earn yield
- **Token-to-gas conversion**: Users pay fees in tokens they already hold
- **ERC-4337 infrastructure**: Leverages account abstraction for flexible transaction sponsorship
- **Decentralized operation**: No single point of failure or trust dependency

## Integration with EIL

Open Paymaster strongly complements the [Ethereum Interoperability Layer (EIL)](https://github.com/ethereum-optimism/EIL) to achieve a truly unified Ethereum experience:

- **Open Paymaster**: Covers gas on the origin chain
- **EIL CrossChainPaymaster**: Covers gas on destination chains
- **Combined result**: Trustless cross-chain interactions without gas token management

Together, these systems eliminate the need to maintain ETH balances across multiple chains or trust centralized intermediaries.

## Example: Alice Pays Bob Cross-Chain

Alice has 100 USDC on Ethereum mainnet. She wants to send 50 USDC to Bob on Base.

**Traditional approach** (broken UX):
1. Buy ETH with USDC on mainnet
2. Bridge ETH to Base
3. Bridge USDC to Base
4. Send USDC to Bob
5. Bob needs Base ETH to use the funds

**With Open Paymaster + EIL**:
1. Alice sends 50 USDC to Bob's Base address
2. Open Paymaster takes gas payment in USDC on mainnet
3. EIL Voucher Request is fulfilled by an XLP on Base
4. Bob receives 50 USDC on Base, usable immediately

Neither Alice nor Bob needed to understand gas, acquire native tokens, or trust centralized services.

## Key Properties

- **Trustless**: No reliance on centralized operators
- **Permissionless**: Anyone can become a liquidity provider
- **Gasless UX**: Users pay fees in tokens they already hold
- **ERC-4337 native**: Built on the account abstraction standard
- **Cross-chain ready**: Integrates with EIL for multi-chain operations

## Architecture

```
contracts/          # Core smart contracts
├── core/          # BasePaymaster and core logic
├── periphery/     # Oracle adapters and utilities
└── interfaces/    # Contract interfaces

integration/       # Deployment and integration scripts
sdk/              # TypeScript SDK for client integration
frontend/         # Reference UI implementation
```

### Components

**Open Paymaster** (on-chain, required)
- Singleton contract holding all liquidity pools
- Handles token-to-gas conversion and gas sponsorship
- Manages LP deposits, withdrawals, and yield distribution

**Paymaster Router** (off-chain, optional)
- Returns the cheapest pool for a given token
- Example: "Which pool offers the best rate to pay my transaction in USDC?"
- Optimizes gas costs by routing to the most efficient liquidity source

**Frontend** (off-chain, optional)
- Fallback UI for liquidity providers: deposit, withdraw, and rebalance pools
- Fallback UI for users: perform cross-chain gasless transactions when wallet doesn't support Open Paymaster yet
- Example use case: Send funds without gas when your wallet hasn't integrated the paymaster

## Status

This project is under active development. The core contracts implement:

- ERC-4337 paymaster standard
- Pyth oracle integration for price feeds
- Liquidity pool management
- Token-based gas payment flows

## Related Standards

- [ERC-4337](./docs/ERC-4337.md): Account Abstraction standard
- [ERC-7562](./docs/ERC-7562.md): Validation scope rules for AA
- [EIL Documentation](./docs/EIL.md): Ethereum Interoperability Layer overview
- [EIL Research](./docs/EIL_research.md): Deep dive into cross-L2 interoperability

## Vision

Ethereum should feel like a single, unified chain. Users shouldn't need to understand:
- Which chain they're using
- How gas works
- How to acquire native tokens
- How to bridge assets

Open Paymaster is a step toward making blockchain interactions as simple as using any other internet application—while preserving trustlessness and decentralization.

## ETH Global Hackathon Buenos Aires 2025

This project was built during ETH Global Buenos Aires 2025.

**Integrations & Sponsors:**

**Ethereum Interoperability Layer**: Powering the cross-chain gasless experience

**Pyth Network Pull Oracles**: Enabling real-time token-to-ETH conversion at market prices

**Protocol Labs**: Supporting permissionless, censorship-resistant systems that advance Ethereum ecosystem adoption

---

Built with the [Trustless Manifesto](https://github.com/ethereum-optimism/EIL) principles: self-custody, censorship resistance, disintermediation, and verifiable on-chain execution.
