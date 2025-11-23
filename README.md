# Open Paymaster 🪐

A full-stack blockchain application for managing liquidity pools that sponsor transactions. Built with Hardhat 3 for smart contract development and Next.js for the frontend interface.

**Made in Argentina** 🇦🇷

## Features

- **3D Interactive Globe**: WebGL-based visualization of global activity using Three.js
- **Pool Management**: Dashboard for monitoring and managing liquidity pools
- **Smart Contract Integration**: Direct interaction with Open Paymaster contracts via Viem
- **Multi-Auth Support**: Privy integration with passkey, wallet, and email login
- **Real-time Analytics**: Pool metrics including TVL, APR, volume, and rebalancing factors

## Tech Stack

### Smart Contracts
- **Framework**: Hardhat 3 (Beta)
- **Solidity**: 0.8.28
- **Testing**: Foundry-compatible tests + Node.js test runner
- **Development**: Viem for Ethereum interactions

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4
- **3D Graphics**: Three.js, React Three Fiber, Drei
- **Blockchain**: Viem, Privy Auth
- **Type Safety**: TypeScript, Zod

### Monorepo
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd open-paymaster-monorepo

# Install frontend dependencies
cd frontend
pnpm install

# Install contract dependencies
cd ../contracts
pnpm install
```

### Environment Setup

#### Frontend Environment

Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_CHAIN_ID=1
NEXT_PUBLIC_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your-api-key
NEXT_PUBLIC_PAYMASTER_ADDRESS=0x...
```

All environment variables are validated at build time using Zod.

#### Contracts Environment (Optional)

For deploying contracts to Sepolia, set configuration variables:

```bash
# Set private key using hardhat-keystore
cd contracts
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
npx hardhat keystore set SEPOLIA_RPC_URL
```

### Development

#### Frontend Development

```bash
cd frontend
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

#### Smart Contract Development

```bash
cd contracts

# Run all tests
npx hardhat test

# Run Solidity tests only
npx hardhat test solidity

# Run Node.js tests only
npx hardhat test nodejs

# Deploy to local network
npx hardhat ignition deploy ignition/modules/Counter.ts

# Deploy to Sepolia
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
```

### Building for Production

```bash
cd frontend
pnpm build
pnpm start
```

## Project Structure

```
open-paymaster-monorepo/
├── contracts/                 # Smart contract development
│   ├── hardhat.config.ts     # Hardhat 3 configuration
│   ├── scripts/              # Deployment and utility scripts
│   │   └── send-op-tx.ts    # Example OP mainnet transaction
│   ├── ignition/             # Hardhat Ignition deployment modules
│   └── package.json          # Contract dependencies (Hardhat 3, Viem)
│
└── frontend/                  # Next.js application
    ├── app/                   # Next.js App Router pages
    │   ├── page.tsx          # Landing page with 3D globe
    │   ├── pools/            # Pool management routes
    │   └── providers.tsx     # App-wide providers (Privy)
    ├── components/           # React components
    │   ├── ui/              # Reusable UI components
    │   ├── globe.tsx        # 3D globe visualization
    │   ├── control-orb.tsx  # Floating navigation control
    │   └── pool-*.tsx       # Pool-specific components
    ├── config/              # Configuration
    │   └── env.ts          # Environment variable validation
    ├── lib/                # Utilities and integrations
    │   ├── abi/           # Smart contract ABIs
    │   └── sc-actions.ts  # Smart contract action functions
    ├── data/              # Mock/static data
    └── public/           # Static assets
```

## Smart Contracts

The Open Paymaster protocol implements a liquidity pool system that sponsors blockchain transactions. The contracts use ERC-6909 multi-token vault standard for efficient pool management.

📖 **[Read the full contracts documentation →](contracts/README.md)**

### Quick Overview

The system allows liquidity providers to:
- Deposit ETH into token-specific pools
- Earn fees from transaction sponsorship and rebalancing
- Withdraw funds plus accumulated fees

Key features:
- **Multi-token support** via ERC-6909 standard
- **Fee-based incentives** for LPs and rebalancers
- **Oracle-based pricing** for accurate token valuations
- **Pool rebalancing** with discounted rates

### Development with Hardhat 3

This project uses Hardhat 3 (Beta) with the following features:

- **Native TypeScript support** with ESM modules
- **Viem integration** for all Ethereum interactions
- **Foundry-compatible tests** for Solidity unit testing
- **Node.js test runner** (`node:test`) for integration tests
- **Network simulation** for both L1 and OP chains

### Supported Networks

- **hardhatMainnet**: Simulated L1 chain for testing
- **hardhatOp**: Simulated OP chain for L2 development
- **sepolia**: Ethereum Sepolia testnet

### Contract Integration

The frontend interacts with Open Paymaster contracts through [lib/sc-actions.ts](frontend/lib/sc-actions.ts):

- **`createPool()`**: Initialize a new liquidity pool
- **`supplyToPool()`**: Deposit ETH into a pool
- **`withdrawFromPool()`**: Withdraw assets from a pool
- **`rebalancePool()`**: Rebalance pool liquidity

Pool IDs are derived from token addresses using `poolIdFromToken(token: Address)`.

Contract ABIs are defined in [frontend/lib/abi/](frontend/lib/abi/).

For detailed documentation including architecture diagrams, function specifications, and integration examples, see the [contracts README](contracts/README.md).

## Key Components

### 3D Globe ([components/globe.tsx](frontend/components/globe.tsx))
- Renders ~450,000 points using WebGL
- Loads GeoJSON data for continent visualization
- Auto-rotates with smooth animations

### Control Orb ([components/control-orb.tsx](frontend/components/control-orb.tsx))
- Floating navigation UI
- Provides quick access to transfers and authentication
- Appears on all pages except landing

### Pool Dashboard ([app/pools/page.tsx](frontend/app/pools/page.tsx))
- Interactive pool table with sorting
- Real-time metrics and analytics
- Deposit/withdrawal actions

## Development

### Code Quality

```bash
pnpm lint
```

### Path Aliases

The project uses `@/*` path aliases:

```typescript
import { env } from '@/config/env'
import { createPool } from '@/lib/sc-actions'
import { Button } from '@/components/ui/button'
```

## Deployment

This Next.js app can be deployed to:

- **Vercel**: Push to GitHub and connect your repo
- **Self-hosted**: Use `pnpm build && pnpm start`
- **Docker**: Create a Dockerfile with Node.js runtime

Ensure all environment variables are set in your deployment platform.

## Contributing

This project was built during a hackathon. Contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[Add your license here]

## Acknowledgments

- Smart contracts built with [Hardhat 3](https://hardhat.org/)
- Frontend built with [Next.js](https://nextjs.org/)
- Authentication by [Privy](https://privy.io/)
- 3D graphics powered by [Three.js](https://threejs.org/)
- Blockchain interactions via [Viem](https://viem.sh/)
