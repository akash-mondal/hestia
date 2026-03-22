# Smart Contracts

Solidity contracts on Hedera testnet via Hardhat 2.22 + Validation Cloud JSON-RPC.

## Deployed Contracts

| Contract | Address | Functions |
|----------|---------|-----------|
| RiskScoreOracle | `0x7FdC9d74419b60e5126585B586FFfba57a8934A3` | `calculateRisk()` (pure), `registerSite()`, `recordRiskAssessment()` |
| InsurancePremiumCalculator | `0x751f5fD84e0eefc800a94734A386eAcEb9B745a9` | `calculateSavings()` (pure), `checkParametricTrigger()` (pure), `recordInsuranceImpact()` |

## Risk Score Model

```
Total = fuel(0-25) + slope(0-15) + wui(0-20) + access(0-10) + historical(0-10) + weather(0-20)
Categories: Low(≤25) · Moderate(26-50) · High(51-75) · Extreme(76-100)
```

## Insurance Tiers

```
Bronze:   10 WRC/acre → 10% discount
Silver:   25 WRC/acre → 25% discount
Gold:     50 WRC/acre → 39% discount
Platinum: 100 WRC/acre → 50% discount
```

## Usage

```bash
npx hardhat compile
npx hardhat run scripts/deploy.ts --network hedera_testnet
```
