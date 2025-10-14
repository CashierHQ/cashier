import type {
  IntentType as BackendIntentType,
  TransferData as BackendTransferData,
  TransferFromData as BackendTransferFromData,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import { rsMatch } from "$lib/rsMatch";
import { Wallet } from "../wallet";
import { Asset } from "../asset";

export class TransferData {
  constructor(
    public to: Wallet,
    public asset: Asset,
    public from: Wallet,
    public amount: bigint,
  ) {}

  static fromBackendType(data: BackendTransferData): TransferData {
    return new TransferData(
      Wallet.fromBackendType(data.to),
      Asset.fromBackendType(data.asset),
      Wallet.fromBackendType(data.from),
      data.amount,
    );
  }
}

export class TransferFromData {
  constructor(
    public to: Wallet,
    public asset: Asset,
    public from: Wallet,
    public actual_amount: bigint | null,
    public amount: bigint,
    public approve_amount: bigint | null,
    public spender: Wallet,
  ) {}

  static fromBackendType(data: BackendTransferFromData): TransferFromData {
    return new TransferFromData(
      Wallet.fromBackendType(data.to),
      Asset.fromBackendType(data.asset),
      Wallet.fromBackendType(data.from),
      data.actual_amount.length > 0 ? data.actual_amount[0]! : null,
      data.amount,
      data.approve_amount.length > 0 ? data.approve_amount[0]! : null,
      Wallet.fromBackendType(data.spender),
    );
  }
}

export type IntentPayload = TransferData | TransferFromData;

export class IntentType {
  private constructor(public readonly payload: IntentPayload) {}

  static fromBackendType(type: BackendIntentType): IntentType {
    return rsMatch(type, {
      Transfer: (data) => {
        const transferData = TransferData.fromBackendType(data);
        return new IntentType(transferData);
      },
      TransferFrom: (data) => {
        const transferFromData = TransferFromData.fromBackendType(data);
        return new IntentType(transferFromData);
      },
    });
  }
}

export default IntentType;
