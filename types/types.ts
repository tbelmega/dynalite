import type {ScanCommandOutput} from "@aws-sdk/client-dynamodb";

export type DynamoCommandResponse<TBody> = import('http').IncomingMessage & { body: TBody; rawBody?: string };
export type ScanCommandResponse = DynamoCommandResponse<ScanCommandOutput>;
export type LastEvaluatedKey = ScanCommandOutput['LastEvaluatedKey'];
export type AsyncCallback = (err?: unknown) => void;
export type TestDynamoRequest = Record<string, unknown>;
export type TestDynamoResponse = DynamoCommandResponse<Record<string, unknown>>;
export type TestRequestHeaders = Record<string, string>;
export type TestRequestOptions = TestDynamoRequest & {
  headers: TestRequestHeaders;
  signQuery?: boolean;
};
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
export type UpdateAttributeUpdate = {
  Action?: string;
  Value?: RawAttributeValue;
} & Record<string, unknown>;
export type UpdateItemRequest = {
  AttributeUpdates?: Record<string, UpdateAttributeUpdate>;
  ConditionExpression?: string;
  Expected?: PutItemExpectedMap;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, RawAttributeValue>;
  Key?: DynamoItem;
  ReturnConsumedCapacity?: string;
  ReturnItemCollectionMetrics?: string;
  ReturnValues?: string;
  TableName?: string;
  UpdateExpression?: string;
} & Record<string, unknown>;
export type UpdateItemResponseBody = {
  Attributes?: DynamoItem;
  ConsumedCapacity?: ConsumedCapacity;
  Item?: DynamoItem;
} & Record<string, unknown>;
export type UpdateItemResponse = DynamoCommandResponse<UpdateItemResponseBody>;
export type QueryCondition = {
  AttributeValueList?: RawAttributeValue[];
  ComparisonOperator?: string;
} & Record<string, unknown>;
export type QueryRequest = {
  AttributesToGet?: string[];
  ConditionalOperator?: string;
  ConsistentRead?: boolean;
  ExclusiveStartKey?: DynamoItem;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, RawAttributeValue>;
  FilterExpression?: string;
  IndexName?: string;
  KeyConditionExpression?: string;
  KeyConditions?: Record<string, QueryCondition>;
  Limit?: number;
  ProjectionExpression?: string;
  QueryFilter?: Record<string, QueryCondition>;
  ReturnConsumedCapacity?: string;
  ScanIndexForward?: boolean;
  Select?: string;
  TableName?: string;
} & Record<string, unknown>;
export type QueryResponseBody = {
  ConsumedCapacity?: ConsumedCapacity;
  Count?: number;
  Items?: DynamoItem[];
  LastEvaluatedKey?: DynamoItem;
  ScannedCount?: number;
} & Record<string, unknown>;
export type QueryResponse = DynamoCommandResponse<QueryResponseBody>;
export type ScanCondition = QueryCondition;
export type ScanRequest = {
  AttributesToGet?: string[];
  ConditionalOperator?: string;
  ConsistentRead?: boolean;
  ExclusiveStartKey?: DynamoItem;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, RawAttributeValue>;
  FilterExpression?: string;
  IndexName?: string;
  Limit?: number;
  ProjectionExpression?: string;
  ReturnConsumedCapacity?: string;
  ScanFilter?: Record<string, ScanCondition>;
  Segment?: number;
  Select?: string;
  TableName?: string;
  TotalSegments?: number;
} & Record<string, unknown>;
export type ScanResponseBody = {
  ConsumedCapacity?: ConsumedCapacity;
  Count?: number;
  Items?: DynamoItem[];
  LastEvaluatedKey?: DynamoItem;
  ScannedCount?: number;
} & Record<string, unknown>;
export type ScanResponse = DynamoCommandResponse<ScanResponseBody>;
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
export type ListTablesResponseBody = {
  LastEvaluatedTableName?: string;
  TableNames: string[];
};
export type ListTablesResponse = DynamoCommandResponse<ListTablesResponseBody>;
export type TableProvisionedThroughput = {
  LastDecreaseDateTime?: number;
  LastIncreaseDateTime?: number;
  NumberOfDecreasesToday?: number;
  ReadCapacityUnits?: number;
  WriteCapacityUnits?: number;
};
export type BillingModeSummary = {
  BillingMode?: string;
  LastUpdateToPayPerRequestDateTime?: number;
};
export type TableThroughputModeSummary = {
  LastUpdateToPayPerRequestDateTime?: number;
  TableThroughputMode?: string;
};
export type GlobalSecondaryIndexDescription = {
  IndexArn?: string;
  IndexName?: string;
  IndexSizeBytes?: number;
  IndexStatus?: string;
  ItemCount?: number;
  KeySchema?: Array<{ AttributeName: string; KeyType: string }>;
  Projection?: { NonKeyAttributes?: string[]; ProjectionType?: string };
  ProvisionedThroughput?: TableProvisionedThroughput;
};
export type TableDescriptionSummary = {
  AttributeDefinitions?: Array<{ AttributeName: string; AttributeType: string }>;
  BillingModeSummary?: BillingModeSummary;
  CreationDateTime?: number;
  GlobalSecondaryIndexes?: GlobalSecondaryIndexDescription[];
  ItemCount?: number;
  KeySchema?: Array<{ AttributeName: string; KeyType: string }>;
  LocalSecondaryIndexes?: GlobalSecondaryIndexDescription[];
  ProvisionedThroughput?: TableProvisionedThroughput;
  TableArn?: string;
  TableId?: string;
  TableName?: string;
  TableSizeBytes?: number;
  TableStatus?: string;
  TableThroughputModeSummary?: TableThroughputModeSummary;
};
export type UpdateTableResponseBody = {
  __type?: string;
  message?: string;
  Table?: TableDescriptionSummary;
  TableDescription?: TableDescriptionSummary;
};
export type UpdateTableResponse = DynamoCommandResponse<UpdateTableResponseBody>;
export type CreateTableResponse = UpdateTableResponse;
export type GetItemRequest = {
  AttributesToGet?: string[];
  ConsistentRead?: boolean;
  ExpressionAttributeNames?: Record<string, string>;
  Key: DynamoItem;
  ProjectionExpression?: string;
  ReturnConsumedCapacity?: string;
  TableName: string;
} & Record<string, unknown>;
export type GetItemResponseBody = {
  ConsumedCapacity?: ConsumedCapacity;
  Item?: DynamoItem;
};
export type GetItemResponse = DynamoCommandResponse<GetItemResponseBody>;
export type LegacyNamingOptions = {
  prefix?: string;
};
export type LegacyNaming = {
  randomString: () => string;
  randomNumber: () => string;
  randomName: () => string;
  strDecrement: (str: string, regex?: RegExp, length?: number) => string;
};
export type HelperRequestDefaults = {
  host: string;
  method: 'POST';
  port?: number;
};
export type HelperResponseBody = string | ({ __type?: string; Message?: string; message?: string } & Record<string, unknown>);
export type HelperHttpResponse = import('http').IncomingMessage & {
  body: HelperResponseBody;
  rawBody: string;
};
export type HelperCallback = (err?: unknown) => void;
export type HelperResponseCallback<TResponse = HelperHttpResponse> = (err?: unknown, res?: TResponse) => void;
export type InstanceRequestOptions = Record<string, unknown> & {
  body?: string;
  headers?: TestRequestHeaders;
  host?: string;
  method?: string;
  noSign?: boolean;
  port?: number;
  retries?: number;
  signQuery?: boolean;
};
export type InstanceHelperOptions = {
  awsAccountId?: string;
  awsRegion?: string;
  port?: number;
  prefix?: string;
  readCapacity?: number;
  runSlowTests?: boolean;
  useRemoteDynamo?: boolean | string;
  version?: string;
  writeCapacity?: number;
};
export type InstanceHelperSharedOptions = {
  runSlowTests?: boolean;
  useRemoteDynamo?: boolean | string;
};
export type InstanceSafeCleanupOptions = {
  deleteRemoteTables?: boolean;
};
export type InstanceTestTablesOptions = {
  createRemoteTables?: boolean;
};
export type HelperAttributeDefinition = {
  AttributeName: string;
  AttributeType: string;
};
export type HelperKeySchemaElement = {
  AttributeName: string;
  KeyType: string;
};
export type HelperProjection = {
  NonKeyAttributes?: string[];
  ProjectionType: string;
};
export type HelperProvisionedThroughput = {
  ReadCapacityUnits: number;
  WriteCapacityUnits: number;
};
export type HelperSecondaryIndexDefinition = {
  IndexName: string;
  KeySchema: HelperKeySchemaElement[];
  Projection: HelperProjection;
  ProvisionedThroughput?: HelperProvisionedThroughput;
};
export type HelperTableDefinition = {
  AttributeDefinitions: HelperAttributeDefinition[];
  BillingMode?: string;
  GlobalSecondaryIndexes?: HelperSecondaryIndexDefinition[];
  KeySchema: HelperKeySchemaElement[];
  LocalSecondaryIndexes?: HelperSecondaryIndexDefinition[];
  ProvisionedThroughput?: HelperProvisionedThroughput;
  TableName: string;
};
export type BatchWriteActions = {
  deletes?: DynamoItem[];
  puts?: DynamoItem[];
};
export type DescribeTableResponseBody = {
  __type?: string;
  Message?: string;
  message?: string;
  Table?: TableDescriptionSummary & { TableArn?: string };
};
export type DescribeTableResponse = DynamoCommandResponse<DescribeTableResponseBody>;
export type ConfiguredInstanceTestHelper = {
  awsAccountId?: string;
  awsRegion: string;
  options: InstanceHelperOptions;
  port: number;
  prefix: string;
  readCapacity: number;
  requestOpts: HelperRequestDefaults;
  runSlowTests?: boolean;
  server: import('http').Server | null;
  testHashNTable: string;
  testHashTable: string;
  testRangeBTable: string;
  testRangeNTable: string;
  testRangeTable: string;
  useRemoteDynamo?: boolean | string;
  version: string;
  writeCapacity: number;
  randomName: () => string;
  randomNumber: () => string;
  randomString: () => string;
};
export type InstanceTestHelper = ConfiguredInstanceTestHelper & {
  batchBulkPut: (name: string, items: DynamoItem[], segmentsOrDone: number | HelperCallback, done?: HelperCallback) => void;
  batchWriteUntilDone: (name: string, actions: BatchWriteActions, cb: HelperCallback) => void;
  clearTable: (name: string, keyNames: string | string[], segmentsOrDone: number | HelperCallback, done?: HelperCallback) => void;
  createAndWait: (table: HelperTableDefinition, done: HelperResponseCallback) => void;
  createAndWaitWithRetry: (table: HelperTableDefinition, done: HelperResponseCallback) => void;
  createTestTables: (done: HelperCallback) => void;
  deleteAndWait: (name: string, done: HelperCallback) => void;
  deleteAndWaitSafe: (name: string, done: HelperCallback) => void;
  deleteTestTables: (done: HelperCallback) => void;
  deleteWhenActive: (name: string, done?: HelperCallback) => void;
  getAccountId: (done: HelperCallback) => void;
  opts: (target: string, data: unknown) => InstanceRequestOptions;
  replaceTable: (name: string, keyNames: string | string[], items: DynamoItem[], segmentsOrDone: number | HelperCallback, done?: HelperCallback) => void;
  request: (opts: InstanceRequestOptions | HelperResponseCallback, cb?: HelperResponseCallback) => void;
  scanSegmentAndDelete: (tableName: string, keyNames: string[], totalSegments: number, segment: number, cb: (err?: unknown, hadKeys?: boolean) => void) => void;
  startServer: () => Promise<void>;
  stopServer: () => Promise<void>;
  verifyTablesDeleted: (tableNames: string[], done: HelperCallback) => void;
  waitUntilActive: (name: string, done: HelperResponseCallback) => void;
  waitUntilDeleted: (name: string, done: HelperResponseCallback) => void;
  waitUntilDeletedSafe: (name: string, done: HelperCallback) => void;
  waitUntilIndexesActive: (name: string, done: HelperResponseCallback) => void;
};
export type LegacyRequestApiDeps = {
  maxRetries: number;
  requestOpts: HelperRequestDefaults;
  startGlobalServer: (done: HelperCallback) => void;
  useRemoteDynamo?: boolean | string;
  version: string;
};
export type LegacyRequestApi = {
  assertSerialization: (target: string, data: unknown, msg: string, done: HelperCallback) => void;
  opts: (target: string, data: unknown) => InstanceRequestOptions;
  request: (opts: InstanceRequestOptions | HelperResponseCallback, cb?: HelperResponseCallback) => void;
};
export type LegacySerializationTestValue =
  | boolean
  | number
  | string
  | LegacySerializationTestValue[]
  | { [key: string]: LegacySerializationTestValue };
export type LegacyValidationMessage = string | RegExp | Array<string | RegExp>;
export type LegacyAssertionsDependencies = {
  assertSerialization: LegacyRequestApi['assertSerialization'];
  opts: LegacyRequestApi['opts'];
  request: LegacyRequestApi['request'];
};
export type LegacyAssertionsApi = {
  assertAccessDenied: (target: string, data: unknown, msg: string | RegExp, done: HelperCallback) => void;
  assertConditional: (target: string, data: unknown, done: HelperCallback) => void;
  assertInUse: (target: string, data: unknown, msg: string, done: HelperCallback) => void;
  assertNotFound: (target: string, data: unknown, msg: string, done: HelperCallback) => void;
  assertType: (target: string, property: string, type: string, done: HelperCallback) => void;
  assertValidation: (target: string, data: unknown, msg: LegacyValidationMessage, done: HelperCallback) => void;
};
export type LegacyTableLifecycleDependencies = {
  opts: (target: string, data: unknown) => InstanceRequestOptions;
  request: LegacyRequestApi['request'];
};
export type LegacyTableLifecycleApi = {
  createAndWait: (table: HelperTableDefinition, done: HelperResponseCallback) => void;
  deleteWhenActive: (name: string, done?: HelperCallback) => void;
  waitUntilActive: (name: string, done: HelperResponseCallback) => void;
  waitUntilDeleted: (name: string, done: HelperResponseCallback) => void;
  waitUntilIndexesActive: (name: string, done: HelperResponseCallback) => void;
};
export type LegacyTableDataDependencies = {
  opts: (target: string, data: unknown) => InstanceRequestOptions;
  request: LegacyRequestApi['request'];
};
export type LegacyTableDataApi = {
  batchBulkPut: (name: string, items: DynamoItem[], segmentsOrDone: number | HelperCallback, done?: HelperCallback) => void;
  batchWriteUntilDone: (name: string, actions: BatchWriteActions, cb: HelperCallback) => void;
  clearTable: (name: string, keyNames: string | string[], segmentsOrDone: number | HelperCallback, done?: HelperCallback) => void;
  replaceTable: (name: string, keyNames: string | string[], items: DynamoItem[], segmentsOrDone: number | HelperCallback, done?: HelperCallback) => void;
};
export type LegacyHelperExports = LegacyAssertionsApi &
  LegacyRequestApi &
  LegacyTableDataApi &
  LegacyTableLifecycleApi & {
    MAX_SIZE: number;
    awsAccountId?: string;
    awsRegion: string;
    prefix: string;
    randomName: () => string;
    randomNumber: () => string;
    randomString: () => string;
    readCapacity: number;
    runSlowTests: boolean;
    strDecrement: LegacyNaming['strDecrement'];
    testHashNTable: string;
    testHashTable: string;
    testRangeBTable: string;
    testRangeNTable: string;
    testRangeTable: string;
    version: string;
    writeCapacity: number;
  };
