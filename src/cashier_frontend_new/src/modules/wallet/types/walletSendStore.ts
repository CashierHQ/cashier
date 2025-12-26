import type { ReceiveAddressType } from ".";

/**
 * Transaction state enum
 * Follows project pattern: SCREAMING_SNAKE_CASE keys with string values
 */
export enum TxState {
  CONFIRM = "CONFIRM",
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

export interface ValidateSendParams {
  selectedToken: string;
  receiveAddress: string;
  amount: number;
  receiveType: ReceiveAddressType;
  maxAmount: number;
}

export interface ComputeSendFeeParams {
  selectedToken: string;
  amount: number;
  receiveAddress: string;
}

export interface ExecuteSendParams {
  selectedToken: string;
  receiveAddress: string;
  amount: number;
  receiveType: ReceiveAddressType;
}
