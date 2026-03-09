import { Client, AccountId, PrivateKey } from '@hashgraph/sdk';

export function getClient(): Client {
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;

  if (!accountId || !privateKey) {
    throw new Error('HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be set');
  }

  const client = Client.forTestnet();
  client.setOperator(AccountId.fromString(accountId), PrivateKey.fromStringDer(privateKey));

  return client;
}
