# Zeno Business Model — Who Funds the dMRV?

## Revenue Streams and Cost Allocation

### Polluter Pays Principle

| Cost Item | Who Pays | Amount | Justification |
|-----------|----------|--------|---------------|
| OCEMS sensors + installation | Facility | $10-15K one-time | CPCB mandate — already required for 17 categories |
| AWS KMS key (HSM) | Facility | ~$1/month | Tamper-proof signing of sensor data |
| Hedera transactions | Facility (via OCEMS agent) | ~$0.001/reading | Sensor readings every 15 min = ~$2.90/month |
| Guardian hosting | SPCB / CPCB | Shared infra | Managed Guardian Service (free tier) or self-hosted |
| Satellite data | Free (Copernicus) | $0 | Sentinel-2 is open access under EU Copernicus program |

### GGCC Market

Compliant facilities earn GGCC tokens. Market mechanisms:

1. **Compliance credit trading**: Facilities with surplus credits sell to those needing offset
2. **Regulatory incentive**: GGCC holders qualify for expedited permit renewal
3. **Insurance premium reduction**: Track record of compliance → lower environmental liability premiums
4. **NMCG ROI proof**: Government can quantify Namami Gange program outcomes

### Revenue Model for Zeno Platform

1. **SaaS fee**: Per-facility monitoring subscription ($50-200/month)
2. **Transaction fees**: Small percentage of GGCC trades
3. **Data licensing**: Aggregated compliance data for research, policy-making
4. **Consulting**: Methodology adaptation for other jurisdictions

## Parametric Insurance Concept

Inspired by Daniel Swid's Tahoe HOA example (39% lower premiums, 89% lower deductibles):

**How it works for Zeno:**
- Insurer accesses on-chain GGCC/ZVIOL history
- GGCC track record = quantified compliance history → lower premium
- Satellite cross-validation = independent verification → insurer confidence
- ZVIOL records trigger automatic claim processing (parametric payout)
- Smart contract (PenaltyCalculator) computes penalties per CPCB rules

**Example scenario:**
- Factory A: 12 months GGCC, 0 ZVIOL → 30% premium reduction
- Factory B: 8 months GGCC, 4 ZVIOL → standard premium + monitoring surcharge
- Factory C: satellite detects discharge spike → automatic environmental cleanup payout triggered

## Scale Economics

India has 4,433 GPIs across 17 industrial categories. At scale:
- 4,433 facilities × $100/month = $443K/month recurring revenue
- 4,433 × ~96 readings/day × 365 = 155M readings/year on Hedera
- Each reading generates compliance data that feeds SEEA stock/flow accounts for the entire Ganga basin
