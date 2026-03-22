# Hestia Web App

Next.js 16 frontend — 8-step guided flow, Guardian/contract/satellite API routes, Mapbox GL 3D visualization.

## Structure

```
src/
├── app/hestia/             # Pages (landing + flow)
├── app/api/hestia/         # API routes
│   ├── guardian/            # submit, approve, sites, plans, risk, monitor
│   ├── contracts/           # risk-score + insurance (eth_call to Hedera)
│   └── satellite/           # FIRMS fires + Sentinel-2 NDVI
├── components/hestia/flow/ # 8 guided step components
├── lib/hestia-*.ts         # Server helpers, constants
└── types/hestia.ts         # Guardian schema interfaces
```

## API Routes

| Route | Method | Calls | Real? |
|-------|--------|-------|-------|
| `guardian/submit` | POST | Guardian → Hedera HCS | ✓ creates VC |
| `guardian/approve` | POST | Guardian → Hedera HCS | ✓ approves doc |
| `contracts/risk-score` | GET | eth_call → RiskScoreOracle | ✓ on-chain |
| `contracts/insurance` | GET | eth_call → InsurancePremiumCalculator | ✓ on-chain |
| `satellite/fires` | GET | NASA FIRMS | ✓ (demo fallback) |
| `satellite/vegetation` | GET | Sentinel-2 NDVI/dNBR | ✓ (demo fallback) |
