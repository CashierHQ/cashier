/**
 * Transaction kind enum-like class (similar to ActionState pattern)
 */
export class TransactionKind {
  private constructor() {}
  static readonly TRANSFER = "transfer" as const;
  static readonly MINT = "mint" as const;
  static readonly BURN = "burn" as const;
  static readonly APPROVE = "approve" as const;
}

export type TransactionKindValue =
  | typeof TransactionKind.TRANSFER
  | typeof TransactionKind.MINT
  | typeof TransactionKind.BURN
  | typeof TransactionKind.APPROVE;
