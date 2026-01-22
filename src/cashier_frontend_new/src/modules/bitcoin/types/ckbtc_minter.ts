export type WithdrawalFee = {
  minter_fee: bigint;
  bitcoin_fee: bigint;
};

export type MinterInfo = {
  kyt_fee: bigint;
  retrieve_btc_min_amount: bigint;
  min_confirmations: number;
};
