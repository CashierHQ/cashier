/**
 * WithdrawalFee type representing fees associated with a withdrawal
 */
export type WithdrawalFee = {
  minter_fee: bigint;
  bitcoin_fee: bigint;
};

/**
 * RetrieveBtcStatusKind enum representing the various statuses of a Bitcoin retrieval process
 */
export class RetrieveBtcStatusKind {
  static readonly Signing = "Signing";
  static readonly Sending = "Sending";
  static readonly Submitted = "Submitted";
  static readonly Confirmed = "Confirmed";
  static readonly Pending = "Pending";
  static readonly Unknown = "Unknown";
  static readonly AmountTooLow = "AmountTooLow";
  static readonly WillReimburse = "WillReimburse";
  static readonly Reimbursed = "Reimbursed";
}

/**
 * RetrieveBtcStatus type representing the status of a Bitcoin retrieval process
 */
export type RetrieveBtcStatusKindValue =
  | typeof RetrieveBtcStatusKind.Signing
  | typeof RetrieveBtcStatusKind.Sending
  | typeof RetrieveBtcStatusKind.Submitted
  | typeof RetrieveBtcStatusKind.Confirmed
  | typeof RetrieveBtcStatusKind.Pending
  | typeof RetrieveBtcStatusKind.Unknown
  | typeof RetrieveBtcStatusKind.AmountTooLow
  | typeof RetrieveBtcStatusKind.WillReimburse
  | typeof RetrieveBtcStatusKind.Reimbursed;

/**
 * RetrieveBtcStatus type representing the status of a Bitcoin retrieval process, including the transaction ID if available
 */
export type RetrieveBtcStatus = {
  kind: RetrieveBtcStatusKindValue;
  txid: string | null;
};

/**
 * RetrieveBtcStatusByAccountItem type representing the status of a Bitcoin retrieval process for a specific account, including the block index and status
 */
export type RetrieveBtcStatusByAccountItem = {
  block_index: bigint;
  status_v2: RetrieveBtcStatus | null;
};

/**
 * MinterInfo type representing information about the ckBTC Minter
 */
export type MinterInfo = {
  kyt_fee: bigint;
  retrieve_btc_min_amount: bigint;
  min_confirmations: number;
};
