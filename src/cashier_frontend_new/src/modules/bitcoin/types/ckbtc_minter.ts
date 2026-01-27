/**
 * WithdrawalFee type representing fees associated with a withdrawal
 */
export type WithdrawalFee = {
  minter_fee: bigint;
  bitcoin_fee: bigint;
};

/**
 * MinterInfo type representing information about the ckBTC Minter
 */
export type MinterInfo = {
  kyt_fee: bigint;
  retrieve_btc_min_amount: bigint;
  min_confirmations: number;
};
