import type {ScanCommandOutput} from "@aws-sdk/client-dynamodb";

export type DynamoCommandResponse<TBody> = import('http').IncomingMessage & { body: TBody };
export type ScanCommandResponse = DynamoCommandResponse<ScanCommandOutput>;
export type LastEvaluatedKey = ScanCommandOutput['LastEvaluatedKey'];
export type AsyncCallback = (err?: unknown) => void;
export type TestDynamoRequest = Record<string, unknown>;
export type TestDynamoResponse = DynamoCommandResponse<Record<string, unknown>>;
export type RawAttributeValue = {
  B?: string;
  BOOL?: boolean;
  BS?: string[];
  L?: RawAttributeValue[];
  M?: Record<string, RawAttributeValue>;
  N?: string;
  NS?: string[];
  NULL?: boolean;
  S?: string;
  SS?: string[];
} & Record<string, unknown>;
export type DynamoItem = Record<string, RawAttributeValue>;
export type InvalidAttributeValue = Record<string, unknown>;
export type ValidationCase = [InvalidAttributeValue, string];
export type KeysAndAttributes = {
  AttributesToGet?: string[];
  ConsistentRead?: boolean;
  ExpressionAttributeNames?: Record<string, string>;
  Keys?: DynamoItem[];
  ProjectionExpression?: string;
};
export type BatchGetRequest = {
  RequestItems: Record<string, KeysAndAttributes>;
  ReturnConsumedCapacity?: string;
};
export type PutRequest = { PutRequest: { Item: DynamoItem } };
export type DeleteRequest = { DeleteRequest: { Key: DynamoItem } };
export type WriteRequest = PutRequest | DeleteRequest;
export type BatchWriteRequest = {
  RequestItems: Record<string, WriteRequest[]>;
  ReturnConsumedCapacity?: string;
  ReturnItemCollectionMetrics?: string;
};
export type BatchWriteResponseBody = {
  ConsumedCapacity?: ConsumedCapacity[];
  UnprocessedItems?: Record<string, WriteRequest[]>;
  __type?: string;
};
export type ConsumedCapacity = { CapacityUnits?: number; Table?: { CapacityUnits?: number }; TableName?: string };
export type BatchGetItemOutput = {
  ConsumedCapacity?: ConsumedCapacity[];
  Responses: Record<string, DynamoItem[]>;
  UnprocessedKeys: Record<string, KeysAndAttributes>;
};
export type BatchGetItemResponse = DynamoCommandResponse<BatchGetItemOutput>;
export type BatchWriteItemResponse = DynamoCommandResponse<BatchWriteResponseBody>;
export type CreateTableRequest = {
  AttributeDefinitions: Array<{ AttributeName: string; AttributeType: string }>;
  KeySchema: Array<{ AttributeName: string; KeyType: string }>;
  ProvisionedThroughput: { ReadCapacityUnits: number; WriteCapacityUnits: number };
  TableName: string;
};
export type PutItemExpectedAttributeValue = {
  AttributeValueList?: RawAttributeValue[];
  ComparisonOperator?: string;
  Exists?: boolean;
  Value?: RawAttributeValue;
} & Record<string, unknown>;
export type PutItemExpectedMap = Record<string, PutItemExpectedAttributeValue>;
export type PutItemRequest = {
  ConditionExpression?: string;
  Expected?: PutItemExpectedMap;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, RawAttributeValue>;
  Item?: DynamoItem;
  ReturnConsumedCapacity?: string;
  ReturnItemCollectionMetrics?: string;
  ReturnValues?: string;
  TableName?: string;
} & Record<string, unknown>;
export type PutItemResponseBody = {
  Attributes?: DynamoItem;
  ConsumedCapacity?: ConsumedCapacity;
  Item?: DynamoItem;
  TableDescription?: Record<string, unknown>;
} & Record<string, unknown>;
export type PutItemResponse = DynamoCommandResponse<PutItemResponseBody>;
export type InvalidAttributeValueCase = [InvalidAttributeValue, string];
export type StringValidationCase = [string, string];
export type ResourceTag = { Key: string; Value: string };
export type ListTagsOfResourceResponseBody = { Tags: ResourceTag[] };
export type ListTagsOfResourceResponse = DynamoCommandResponse<ListTagsOfResourceResponseBody>;
export type DeleteTableResponseBody = {
  TableDescription: {
    GlobalSecondaryIndexes?: unknown;
    TableStatus?: string;
  };
  __type?: string;
} & Record<string, unknown>;
export type DeleteTableResponse = DynamoCommandResponse<DeleteTableResponseBody>;
