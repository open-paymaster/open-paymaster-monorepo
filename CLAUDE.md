# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Open Paymaster is a full-stack blockchain application consisting of smart contracts (Hardhat 3) and a frontend (Next.js). The system manages liquidity pools that sponsor blockchain transactions using ERC-6909 multi-token vaults.

## Commands

### Frontend

```bash
cd frontend

# Development
pnpm dev              # Start Next.js dev server (http://localhost:3000)

# Building
pnpm build            # Build production bundle
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint
```

### Contracts

```bash
cd contracts

# Testing
npx hardhat test              # Run all tests
npx hardhat test solidity     # Run Solidity tests only
npx hardhat test nodejs       # Run Node.js tests only

# Deployment
npx hardhat ignition deploy ignition/modules/Counter.ts                    # Local
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts  # Sepolia
```

## Architecture

### Smart Contracts

The Open Paymaster contract implements two main components:
- **OpenPaymaster**: Pool management and rebalancing logic
- **ERC6909NativeEntryPointVault**: Multi-token vault for ETH deposits/withdrawals

Full contract documentation with diagrams is in [contracts/README.md](contracts/README.md).

Key contract patterns:
- **Pool ID Derivation**: `poolId = uint256(tokenAddress)` creates a 1:1 token-to-pool mapping
- **ERC-6909 Standard**: Enables efficient multi-token vault management in a single contract
- **Fee Structure**: Two-tier fees (LP fees + rebalancing fees) in basis points
- **Oracle Dependency**: Each pool uses a price oracle for accurate token valuations

### Frontend Smart Contract Integration

Contract interactions are centralized in [lib/sc-actions.ts](frontend/lib/sc-actions.ts):

- **Pool ID Derivation**: Pool IDs are derived from token addresses using `poolIdFromToken(token: Address): bigint`
- **Client Setup**: Uses Viem with separate `publicClient` (reads) and `walletClient` (writes via MetaMask)
- **Core Actions**:
  - `createPool()` - Initialize new pool via `initializePool`
  - `supplyToPool()` - Deposit ETH via `deposit` (requires `value` to equal `assetsWei`)
  - `withdrawFromPool()` - Withdraw via `withdraw`
  - `rebalancePool()` - Rebalance pool liquidity via `rebalance`

The Open Paymaster ABI is defined in [lib/abi/OpenPaymaster.ts](frontend/lib/abi/OpenPaymaster.ts).

### Environment Configuration

Environment variables are validated at build time using Zod in [config/env.ts](frontend/config/env.ts). Required variables:

- `NEXT_PUBLIC_PRIVY_APP_ID` - Privy authentication app ID
- `NEXT_PUBLIC_CHAIN_ID` - Target blockchain network ID
- `NEXT_PUBLIC_RPC_URL` - RPC endpoint URL
- `NEXT_PUBLIC_PAYMASTER_ADDRESS` - Deployed paymaster contract address

Create a `.env.local` file with these variables before running the app.

### Authentication & State

- **Privy Integration**: Configured in [app/providers.tsx](frontend/app/providers.tsx) with passkey, wallet, and email login methods
- **ControlOrb**: A floating UI control ([components/control-orb.tsx](frontend/components/control-orb.tsx)) rendered on all pages except home (`/`), providing navigation and action shortcuts

### Routing Structure

- `/` - Landing page with interactive 3D globe visualization
- `/pools` - Pool management dashboard with tables and analytics

The app uses Next.js 16 App Router. All routes are in [app/](frontend/app/).

### UI Components

- **Globe**: WebGL-based 3D globe using Three.js/React Three Fiber in [components/globe.tsx](frontend/components/globe.tsx), renders ~450k points with GeoJSON continent data
- **Custom UI**: Reusable components in [components/ui/](frontend/components/ui/) including SlideOver, Tooltip, and LiquidGlassButton
- **Pool Components**: Table ([pool-table.tsx](frontend/components/pool-table.tsx)), analytics ([pool-analytics-shell.tsx](frontend/components/pool-analytics-shell.tsx)), and status cards with donut charts

### Data Layer

Mock pool data is defined in [data/pools.ts](frontend/data/pools.ts) with type `PoolRow`. This should be replaced with real on-chain data fetching in production.

### TypeScript Configuration

The project uses path aliases via `@/*` mapping to the frontend root directory. Import from `@/components/...`, `@/lib/...`, etc. See [tsconfig.json](frontend/tsconfig.json).

### Styling

- **Framework**: Tailwind CSS 4 (configured via [postcss.config.mjs](frontend/postcss.config.mjs))
- **Fonts**: Geist Sans and Geist Mono from `next/font/google`
- **Globals**: Base styles in [app/globals.css](frontend/app/globals.css)
