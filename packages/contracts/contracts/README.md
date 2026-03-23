# Smart Contracts

Solidity contracts deployed on Hedera testnet.

| Contract | Address | Purpose |
|----------|---------|---------|
| [RiskScoreOracle](https://hashscan.io/testnet/contract/0x7FdC9d74419b60e5126585B586FFfba57a8934A3) | `0x7FdC9d74419b60e5126585B586FFfba57a8934A3` | 6-component wildfire risk model |
| [InsurancePremiumCalculator](https://hashscan.io/testnet/contract/0x751f5fD84e0eefc800a94734A386eAcEb9B745a9) | `0x751f5fD84e0eefc800a94734A386eAcEb9B745a9` | WRC-to-discount tier mapping + parametric trigger |

Both contracts expose pure functions callable via `eth_call` at zero gas cost through the Validation Cloud JSON-RPC relay.

The `hedera/` subdirectory contains Hedera-specific Solidity libraries (HTS precompile interfaces).
