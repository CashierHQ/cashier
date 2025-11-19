import type {
  IntentType as BackendIntentType,
  TransferData as BackendTransferData,
  TransferFromData as BackendTransferFromData,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import { rsMatch } from "$lib/rsMatch";
import Asset from "../asset";
import Wallet from "../wallet";
import { Principal } from "@dfinity/principal";

// Frontend representation of TransferData for IntentType
export class TransferData {
  constructor(
    public readonly to: Wallet,
    public readonly asset: Asset,
    public readonly from: Wallet,
    public readonly amount: bigint,
  ) {}
}

export class TransferDataMapper {
  // Convert from backend TransferData to frontend TransferData
  static fromBackendType(data: BackendTransferData): TransferData {
    return new TransferData(
      Wallet.fromBackendType(data.to),
      Asset.fromBackendType(data.asset),
      Wallet.fromBackendType(data.from),
      data.amount,
    );
  }

  // Devalue serde for TransferData
  static serde = {
    serialize: {
      TransferData: (value: unknown) => {
        if (!(value instanceof TransferData)) return undefined;
        return {
          to: {
            address: value.to.address.toString(),
            subaccount: value.to.subaccount,
          },
          asset: {
            chain: value.asset.chain,
            address: value.asset.address.toString(),
          },
          from: {
            address: value.from.address.toString(),
            subaccount: value.from.subaccount,
          },
          amount: value.amount,
        };
      },
    },
    deserialize: {
      TransferData: (obj: unknown) => {
        const s = obj as {
          to: { address: string; subaccount: Uint8Array | number[] | null };
          asset: { chain: string; address: string };
          from: { address: string; subaccount: Uint8Array | number[] | null };
          amount: bigint;
        };

        const toWallet = new Wallet(
          Principal.fromText(s.to.address),
          s.to.subaccount ?? null,
        );
        const fromWallet = new Wallet(
          Principal.fromText(s.from.address),
          s.from.subaccount ?? null,
        );
        const asset = Asset.IC(Principal.fromText(s.asset.address));

        return new TransferData(toWallet, asset, fromWallet, s.amount);
      },
    },
  };
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

export class TransferFromDataMapper {
  // Convert from backend TransferFromData to frontend TransferFromData
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

  // Devalue serde for TransferFromData
  static serde = {
    serialize: {
      TransferFromData: (value: unknown) => {
        if (!(value instanceof TransferFromData)) return undefined;
        return {
          to: {
            address: value.to.address.toString(),
            subaccount: value.to.subaccount,
          },
          asset: {
            chain: value.asset.chain,
            address: value.asset.address.toString(),
          },
          from: {
            address: value.from.address.toString(),
            subaccount: value.from.subaccount,
          },
          actual_amount: value.actual_amount,
          amount: value.amount,
          approve_amount: value.approve_amount,
          spender: {
            address: value.spender.address.toString(),
            subaccount: value.spender.subaccount,
          },
        };
      },
    },
    deserialize: {
      TransferFromData: (obj: unknown) => {
        const s = obj as {
          to: { address: string; subaccount: Uint8Array | number[] | null };
          asset: { chain: string; address: string };
          from: { address: string; subaccount: Uint8Array | number[] | null };
          actual_amount: bigint | null;
          amount: bigint;
          approve_amount: bigint | null;
          spender: {
            address: string;
            subaccount: Uint8Array | number[] | null;
          };
        };

        const toWallet = new Wallet(
          Principal.fromText(s.to.address),
          s.to.subaccount ?? null,
        );
        const fromWallet = new Wallet(
          Principal.fromText(s.from.address),
          s.from.subaccount ?? null,
        );
        const spenderWallet = new Wallet(
          Principal.fromText(s.spender.address),
          s.spender.subaccount ?? null,
        );
        const asset = Asset.IC(Principal.fromText(s.asset.address));

        return new TransferFromData(
          toWallet,
          asset,
          fromWallet,
          s.actual_amount,
          s.amount,
          s.approve_amount,
          spenderWallet,
        );
      },
    },
  };
}

// Union type for IntentType payloads
export type IntentPayload = TransferData | TransferFromData;

// Frontend representation of an IntentType
class IntentType {
  constructor(public readonly payload: IntentPayload) {}
}

export class IntentTypeMapper {
  // Static instances for each IntentType
  static fromBackendType(type: BackendIntentType): IntentType {
    return rsMatch(type, {
      Transfer: (data) => {
        const transferData = TransferDataMapper.fromBackendType(data);
        return new IntentType(transferData);
      },
      TransferFrom: (data) => {
        const transferFromData = TransferFromDataMapper.fromBackendType(data);
        return new IntentType(transferFromData);
      },
    });
  }

  // Devalue serde for IntentType
  static serde = {
    serialize: {
      IntentType: (value: unknown) => {
        if (!(value instanceof IntentType)) return undefined;
        const payload = value.payload;
        if (payload instanceof TransferData) {
          return {
            kind: "Transfer",
            payload: TransferDataMapper.serde.serialize.TransferData(payload),
          };
        }
        if (payload instanceof TransferFromData) {
          return {
            kind: "TransferFrom",
            payload:
              TransferFromDataMapper.serde.serialize.TransferFromData(payload),
          };
        }
        return undefined;
      },
    },
    deserialize: {
      IntentType: (obj: unknown) => {
        const s = obj as { kind: string; payload: unknown };
        if (s.kind === "Transfer") {
          const td = TransferDataMapper.serde.deserialize.TransferData(
            s.payload,
          ) as TransferData;
          return new IntentType(td);
        }
        if (s.kind === "TransferFrom") {
          const tfd = TransferFromDataMapper.serde.deserialize.TransferFromData(
            s.payload,
          ) as TransferFromData;
          return new IntentType(tfd);
        }
        throw new Error(
          `Unknown IntentType kind during deserialize: ${s.kind}`,
        );
      },
    },
  };
}

export default IntentType;
