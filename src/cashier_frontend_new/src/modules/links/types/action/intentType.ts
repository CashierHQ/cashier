import Asset from "$modules/links/types/asset";
import Wallet from "$modules/links/types/wallet";
import { type Intent as SharedIntent } from "$shared";

// Frontend representation of TransferData for IntentType
export class TransferData {
  constructor(
    public readonly to: Wallet,
    public readonly asset: Asset,
    public readonly from: Wallet,
    public readonly amount: bigint,
  ) {}
}

// Frontend representation of TransferFromData for IntentType
export class TransferFromData {
  constructor(
    public readonly to: Wallet,
    public readonly asset: Asset,
    public readonly from: Wallet,
    public readonly actual_amount: bigint | null,
    public readonly amount: bigint,
    public readonly approve_amount: bigint | null,
    public readonly spender: Wallet,
  ) {}
}

// Union type for IntentType payloads
export type IntentPayload = TransferData | TransferFromData;

// Frontend representation of an IntentType
class IntentType {
  constructor(public readonly payload: IntentPayload) {}
}

export class IntentTypeMapper {
  static fromSharedType(intent: SharedIntent): IntentType {
    const transferData = new TransferData(
      new Wallet(intent.dest_address, null),
      new Asset(intent.asset.address),
      new Wallet(intent.source_address, null),
      intent.amount,
    );
    return new IntentType(transferData);
  }
}

export default IntentType;
