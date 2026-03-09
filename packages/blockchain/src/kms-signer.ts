import {
  KMSClient,
  GetPublicKeyCommand,
  SignCommand,
} from '@aws-sdk/client-kms';
import {
  AccountCreateTransaction,
  Hbar,
  PublicKey,
  Transaction,
} from '@hashgraph/sdk';
import { keccak256 } from 'js-sha3';
import * as asn1js from 'asn1js';
import { ec as EC } from 'elliptic';
import { getClient } from './client';

const ec = new EC('secp256k1');

// DER header for ECDSA secp256k1 SPKI public key (strip this from KMS response)
const DER_HEADER_HEX = '3056301006072a8648ce3d020106052b8104000a034200';
// Hedera DER prefix for compressed ECDSA public key
const HEDERA_DER_PREFIX_HEX = '302d300706052b8104000a032200';

function getKMSClient(): KMSClient {
  return new KMSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

function getKMSKeyId(): string {
  const keyId = process.env.KMS_KEY_ID;
  if (!keyId) throw new Error('KMS_KEY_ID must be set');
  return keyId;
}

/**
 * Fetch the public key from KMS, convert from DER SPKI to compressed Hedera format.
 * KMS returns 88-byte DER → strip header → 65-byte uncompressed → compress → 33 bytes
 * → add Hedera DER prefix → PublicKey.fromBytes()
 */
export async function getHederaPublicKeyFromKMS(): Promise<PublicKey> {
  const kms = getKMSClient();

  const response = await kms.send(new GetPublicKeyCommand({ KeyId: getKMSKeyId() }));

  if (!response.PublicKey) {
    throw new Error('KMS returned no public key');
  }

  const derBytes = Buffer.from(response.PublicKey);
  const derHex = derBytes.toString('hex');

  // Strip the DER SPKI header to get the raw uncompressed point
  if (!derHex.startsWith(DER_HEADER_HEX)) {
    throw new Error(`Unexpected DER format. Expected header: ${DER_HEADER_HEX}, got: ${derHex.slice(0, DER_HEADER_HEX.length)}`);
  }

  const rawUncompressedHex = derHex.slice(DER_HEADER_HEX.length);

  // Compress using elliptic: 65-byte uncompressed (04||x||y) → 33-byte compressed (02/03||x)
  const key = ec.keyFromPublic(rawUncompressedHex, 'hex');
  const compressedHex = key.getPublic(true, 'hex');

  // Add Hedera DER prefix
  const hederaKeyHex = HEDERA_DER_PREFIX_HEX + compressedHex;
  const hederaKeyBytes = Buffer.from(hederaKeyHex, 'hex');

  return PublicKey.fromBytes(hederaKeyBytes);
}

/**
 * Create a new Hedera account whose key is the KMS public key.
 * The private key for this account exists ONLY inside the AWS HSM.
 */
export async function createKMSAccount(initialBalance: number = 10): Promise<string> {
  const client = getClient();
  const publicKey = await getHederaPublicKeyFromKMS();

  const tx = new AccountCreateTransaction()
    .setKey(publicKey)
    .setInitialBalance(new Hbar(initialBalance));

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);

  if (!receipt.accountId) throw new Error('Failed to create KMS account');
  return receipt.accountId.toString();
}

/**
 * Parse a DER-encoded ECDSA signature into raw 64-byte R||S format.
 * KMS returns DER: 30 <len> 02 <rLen> <R> 02 <sLen> <S>
 * We extract R and S, strip leading zeros, pad to 32 bytes each, concatenate.
 */
export function parseDERSignature(derSig: Uint8Array): Uint8Array {
  const asn1 = asn1js.fromBER(derSig);

  if (asn1.offset === -1) {
    throw new Error('Failed to parse DER signature');
  }

  const sequence = asn1.result as asn1js.Sequence;
  const rInt = (sequence.valueBlock.value[0] as asn1js.Integer).valueBlock.valueHexView;
  const sInt = (sequence.valueBlock.value[1] as asn1js.Integer).valueBlock.valueHexView;

  // Strip leading 0x00 bytes and pad to 32 bytes
  const r = padTo32(stripLeadingZeros(Buffer.from(rInt)));
  const s = padTo32(stripLeadingZeros(Buffer.from(sInt)));

  return Buffer.concat([r, s]);
}

function stripLeadingZeros(buf: Buffer): Buffer {
  let i = 0;
  while (i < buf.length - 1 && buf[i] === 0) i++;
  return buf.slice(i);
}

function padTo32(buf: Buffer): Buffer {
  if (buf.length === 32) return buf;
  if (buf.length > 32) return buf.slice(buf.length - 32);
  const padded = Buffer.alloc(32);
  buf.copy(padded, 32 - buf.length);
  return padded;
}

/**
 * Build a custom signer function that uses AWS KMS for signing.
 * Compatible with Hedera SDK's Transaction.sign() / addSignature().
 *
 * Flow: message bytes → keccak256 hash → KMS Sign (DIGEST mode) → parse DER → 64-byte R||S
 */
export function buildKMSSigner(): (message: Uint8Array) => Promise<Uint8Array> {
  const kms = getKMSClient();
  const keyId = getKMSKeyId();

  return async (message: Uint8Array): Promise<Uint8Array> => {
    // Hash locally — only the 32-byte digest goes to KMS
    const hashArray = new Uint8Array(
      Buffer.from(keccak256.arrayBuffer(message))
    );

    const signResponse = await kms.send(
      new SignCommand({
        KeyId: keyId,
        Message: hashArray,
        MessageType: 'DIGEST',
        SigningAlgorithm: 'ECDSA_SHA_256',
      })
    );

    if (!signResponse.Signature) {
      throw new Error('KMS returned no signature');
    }

    return parseDERSignature(new Uint8Array(signResponse.Signature));
  };
}

/**
 * Sign and execute a Hedera transaction using the KMS signer.
 * Freezes the transaction, signs with KMS, then executes.
 */
export async function signAndExecute<T extends Transaction>(
  tx: T
): Promise<{ txId: string; receipt: unknown }> {
  const client = getClient();
  const publicKey = await getHederaPublicKeyFromKMS();
  const signer = buildKMSSigner();

  // Freeze to get the transaction bytes
  const frozen = tx.freezeWith(client);
  const txBytes = frozen.toBytes();

  // Sign with KMS
  const signature = await signer(txBytes);
  frozen.addSignature(publicKey, signature);

  // Execute
  const response = await frozen.execute(client);
  const receipt = await response.getReceipt(client);

  return {
    txId: response.transactionId.toString(),
    receipt,
  };
}
