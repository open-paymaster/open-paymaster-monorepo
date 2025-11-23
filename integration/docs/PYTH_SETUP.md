# Pyth Oracle Setup Guide

## Quick Start (Complete Flow)

```bash
# 1. Deploy PythMock
pnpm hardhat run scripts/deployPythOracle.ts --network localhost
# Save the address: 0xABC...

# 2. Set prices on the mock
PYTH_MOCK_ADDRESS=0xABC... pnpm hardhat run scripts/setPythOraclePrice.ts --network localhost

# 3. Deploy Paymaster with Pyth
PYTH_ADDRESS=0xABC... \
ETH_FEED_ID=0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace \
pnpm hardhat run scripts/deployPaymaster.ts --network localhost
# Save the address: 0xDEF...

# 4. Initialize a token pool
PAYMASTER_ADDRESS=0xDEF... \
TOKEN_ADDRESS=0x... \
TOKEN_FEED_ID=0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a \
pnpm hardhat run scripts/initializePool.ts --network localhost
```

---

## Deploy PythMock

Deploy the mock Pyth oracle for testing:

```bash
pnpm hardhat run scripts/deployPythOracle.ts --network localhost
```

Save the deployed address for the next steps.

## Set Default Prices

Set standard prices for common tokens (USDC, USDT, DAI, ETH, BTC):

```bash
PYTH_MOCK_ADDRESS=0x... pnpm hardhat run scripts/setPythOraclePrice.ts --network localhost
```

This will set:
- USDC/USD: $1.00
- USDT/USD: $1.00  
- DAI/USD: $1.00
- ETH/USD: $2,500.00
- BTC/USD: $40,000.00

## Set Custom Price

Set a custom price for any feed:

```bash
PYTH_MOCK_ADDRESS=0x... \
FEED_ID=0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a \
PRICE=1.25 \
pnpm hardhat run scripts/setCustomPrice.ts --network localhost
```

### Common Feed IDs

```typescript
// Stablecoins
USDC_USD = '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a'
USDT_USD = '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b'
DAI_USD  = '0xb0948a5e5313200c632b51bb5ca32f6de0d36e9950a942d19751e833f70dabfd'

// Major tokens
ETH_USD  = '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace'
BTC_USD  = '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43'
```

## Deploy Paymaster with Pyth

Deploy the Open Paymaster with the PythMock:

```bash
PYTH_ADDRESS=0x... \
ETH_FEED_ID=0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace \
pnpm hardhat run scripts/deployPaymaster.ts --network localhost
```

## Price Format

Pyth uses a `price * 10^expo` format:

| Human Price | `price` (int64) | `expo` | Calculation |
|-------------|-----------------|--------|-------------|
| $1.00       | 100000000       | -8     | 1.00 × 10^8 |
| $2,500.00   | 250000000000    | -8     | 2500 × 10^8 |
| $0.0004     | 4000            | -8     | 0.0004 × 10^8 |

## Testing Price Updates

In your tests, you can update prices like this:

```typescript
// Set USDC price to $1.00
await pythMock.setPrice(
  USDC_FEED_ID,
  100000000n,  // price
  -8           // expo
);

// Set ETH price to $2,500
await pythMock.setPrice(
  ETH_FEED_ID,
  250000000000n, // price
  -8             // expo  
);
```

## Production Setup

For production, use the real Pyth contract addresses:

**Mainnet:** `0x4305FB66699C3B2702D4d05CF36551390A4c69C6`
**Base:** `0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a`
**Arbitrum:** `0xff1a0f4744e8582DF1aE09D5611b887B6a12925C`

See full list: https://docs.pyth.network/price-feeds/contract-addresses/evm

Then fetch real prices from Hermes:

```typescript
const response = await fetch(
  `https://hermes.pyth.network/api/latest_vaas?ids[]=${USDC_FEED_ID}&ids[]=${ETH_FEED_ID}`
);
const priceData = await response.json();
```

