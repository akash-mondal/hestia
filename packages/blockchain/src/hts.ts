import {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TokenId,
  TokenAssociateTransaction,
  AccountId,
} from '@hashgraph/sdk';
import { getClient } from './client';

export async function createComplianceCreditToken(): Promise<string> {
  const client = getClient();
  const operatorId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);

  const tx = new TokenCreateTransaction()
    .setTokenName('Ganga Green Compliance Credit')
    .setTokenSymbol('GGCC')
    .setTokenType(TokenType.FungibleCommon)
    .setDecimals(0)
    .setInitialSupply(0)
    .setSupplyType(TokenSupplyType.Infinite)
    .setTreasuryAccountId(operatorId)
    .setTokenMemo('Zeno ComplianceCredit — 1 GGCC = 1 facility-day of verified compliant discharge');

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);

  if (!receipt.tokenId) throw new Error('Failed to create GGCC token');
  return receipt.tokenId.toString();
}

export async function createViolationNFTCollection(): Promise<string> {
  const client = getClient();
  const operatorId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);

  const tx = new TokenCreateTransaction()
    .setTokenName('Zeno Violation Record')
    .setTokenSymbol('ZVIOL')
    .setTokenType(TokenType.NonFungibleUnique)
    .setSupplyType(TokenSupplyType.Infinite)
    .setTreasuryAccountId(operatorId)
    .setTokenMemo('Zeno ViolationNFT — immutable record of discharge standard violation');

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);

  if (!receipt.tokenId) throw new Error('Failed to create ViolationNFT collection');
  return receipt.tokenId.toString();
}

export async function createComplianceCertNFTCollection(): Promise<string> {
  const client = getClient();
  const operatorId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);

  const tx = new TokenCreateTransaction()
    .setTokenName('Zeno Compliance Certificate')
    .setTokenSymbol('ZCERT')
    .setTokenType(TokenType.NonFungibleUnique)
    .setSupplyType(TokenSupplyType.Infinite)
    .setTreasuryAccountId(operatorId)
    .setTokenMemo('Zeno ComplianceCertificateNFT — sustained compliance achievement');

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);

  if (!receipt.tokenId) throw new Error('Failed to create ComplianceCertNFT collection');
  return receipt.tokenId.toString();
}

export async function mintComplianceCredit(
  tokenId: string,
  amount: number
): Promise<string> {
  const client = getClient();

  const tx = new TokenMintTransaction()
    .setTokenId(TokenId.fromString(tokenId))
    .setAmount(amount);

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);

  return response.transactionId.toString();
}

export async function mintViolationNFT(
  tokenId: string,
  metadata: Record<string, unknown>
): Promise<{ txId: string; serial: number }> {
  const client = getClient();
  const metadataBytes = Buffer.from(JSON.stringify(metadata));

  const tx = new TokenMintTransaction()
    .setTokenId(TokenId.fromString(tokenId))
    .addMetadata(metadataBytes);

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);

  return {
    txId: response.transactionId.toString(),
    serial: Number(receipt.serials[0]),
  };
}
