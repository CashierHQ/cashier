/**
 * NFT Type Definitions
 */
export type NFT = {
  readonly id: bigint;
  readonly name: string;
  readonly description: string;
  readonly image: string;
  readonly collectionName: string;
  readonly collectionAddress: string;
  readonly tokenStandard: string;
};
