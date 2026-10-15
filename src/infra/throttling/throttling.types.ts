// The record @nestjs/throttler expects from its storage; the package does not export the type.
export interface ThrottlerStorageRecord {
  readonly totalHits: number;
  readonly timeToExpire: number;
  readonly isBlocked: boolean;
  readonly timeToBlockExpire: number;
}
