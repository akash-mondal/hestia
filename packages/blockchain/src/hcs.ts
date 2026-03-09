import {
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicId,
} from '@hashgraph/sdk';
import { getClient } from './client';
import { getTopicMessages } from './mirror';
import type { SensorReading } from './types';

export async function createFacilityTopic(facilityId: string): Promise<string> {
  const client = getClient();

  const tx = new TopicCreateTransaction()
    .setTopicMemo(`Zeno OCEMS | Facility: ${facilityId}`);

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);

  if (!receipt.topicId) {
    throw new Error('Failed to create topic');
  }

  return receipt.topicId.toString();
}

export async function submitSensorReading(
  topicId: string,
  reading: SensorReading
): Promise<{ txId: string; sequenceNumber: number }> {
  const client = getClient();
  const message = Buffer.from(JSON.stringify(reading)).toString('base64');

  const tx = new TopicMessageSubmitTransaction()
    .setTopicId(TopicId.fromString(topicId))
    .setMessage(message);

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);

  return {
    txId: response.transactionId.toString(),
    sequenceNumber: Number(receipt.topicSequenceNumber),
  };
}

export async function getSensorReadings(
  topicId: string,
  fromTimestamp?: string
): Promise<SensorReading[]> {
  const messages = await getTopicMessages(topicId, { timestampGte: fromTimestamp });

  return messages.map((msg) => {
    const decoded = Buffer.from(msg.message, 'base64').toString('utf-8');
    return JSON.parse(decoded) as SensorReading;
  });
}
