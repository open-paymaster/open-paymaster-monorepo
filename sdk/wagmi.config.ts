import { defineConfig } from "@wagmi/cli";
import { foundry } from "@wagmi/cli/plugins";

export default defineConfig({
  out: "src/generated/abis.ts",
  contracts: [],
  plugins: [
    foundry({
      project: "../contracts",
      include: [
        "UniversalPaymaster.sol/**",
        "EntryPointVault.sol/**",
        "BasePaymaster.sol/**",
        "IOracle.sol/**",
        "OracleMock.sol/**",
        "IEntryPoint.sol/**",
        "EntryPoint.sol/**",
        "ERC20Mock.sol/**",
      ],
    }),
  ],
});

