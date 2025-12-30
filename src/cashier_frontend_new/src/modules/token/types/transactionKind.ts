/**
 * Transaction kind enum-like class (similar to ActionState pattern)
 */
export class TransactionKind {
  private constructor() {}
  static readonly TRANSFER = "transfer";
  static readonly MINT = "mint";
  static readonly BURN = "burn";
  static readonly APPROVE = "approve";
}

export type TransactionKindValue =
  | typeof TransactionKind.TRANSFER
  | typeof TransactionKind.MINT
  | typeof TransactionKind.BURN
  | typeof TransactionKind.APPROVE;
