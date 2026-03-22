# Blockchain Package

Hedera SDK integration — HCS (Consensus), HTS (Token), Mirror Node, AWS KMS signing, trust chain construction.

## Modules

| Module | Purpose |
|--------|---------|
| `client.ts` | Hedera client with operator/KMS signer |
| `hcs.ts` | HCS topic creation and message submission |
| `hts.ts` | HTS token creation, minting, transfers |
| `mirror.ts` | Mirror Node queries (messages, tokens, transactions) |
| `kms-signer.ts` | AWS KMS HSM signing for Hedera transactions |
| `trust-chain.ts` | Multi-level provenance chain construction |
| `compliance.ts` | Parameter compliance evaluation engine |
| `validator.ts` | Ingestion validation layer |

## Key Accounts

- KMS-controlled: `0.0.8148249` (ECC_SECG_P256K1 via AWS KMS)
- WRC Token: `0.0.8312399` (fungible, 2 decimals)
- CERT Token: `0.0.8312401` (NFT)
- HCS Topic: `0.0.8317430` (instance topic)
