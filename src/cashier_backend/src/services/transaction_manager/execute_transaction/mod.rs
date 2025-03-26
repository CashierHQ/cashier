use candid::Nat;
use cashier_types::{FromCallType, IcTransaction, Transaction};
use icrc_ledger_types::{icrc1::transfer::TransferArg, icrc2::transfer_from::TransferFromArgs};

use crate::{types::error::CanisterError, utils::icrc::IcrcService};

#[cfg_attr(test, faux::create)]
pub struct ExecuteTransactionService {
    icrc_service: IcrcService,
}

#[cfg_attr(test, faux::methods)]
impl ExecuteTransactionService {
    pub fn new(icrc_service: IcrcService) -> Self {
        Self { icrc_service }
    }

    pub fn get_instance() -> Self {
        Self::new(IcrcService::new())
    }

    pub async fn execute(&self, transaction: &Transaction) -> Result<(), CanisterError> {
        let from_call_type = transaction.from_call_type.clone();

        match from_call_type {
            FromCallType::Canister => {
                let protocol = transaction.protocol.as_ic_transaction().ok_or_else(|| {
                    CanisterError::HandleLogicError("Unsupported transaction protocol".to_string())
                })?;

                match protocol {
                    // right now only for fee transfer
                    IcTransaction::Icrc2TransferFrom(tx) => {
                        let mut args: TransferFromArgs = TransferFromArgs::try_from(tx.clone())
                            .map_err(|e| CanisterError::HandleLogicError(e.to_string()))?;

                        // get asset
                        let asset = tx
                            .asset
                            .get_principal()
                            .map_err(|e| CanisterError::HandleLogicError(e.to_string()))?;

                        let transfer_amount = u128::try_from(args.amount.clone().0);
                        match transfer_amount {
                            Ok(amount) => {
                                let amount_subtract_fee = {
                                    let token_fee = self.icrc_service.fee(asset).await?;
                                    amount.checked_sub(token_fee as u128)
                                };
                                match amount_subtract_fee {
                                    Some(amount_subtract_fee) => {
                                        args.amount = Nat::from(amount_subtract_fee)
                                    }
                                    None => {
                                        return Err(CanisterError::HandleLogicError(
                                            "Failed to calculate fee".to_string(),
                                        ));
                                    }
                                }
                            }

                            Err(_) => {
                                return Err(CanisterError::HandleLogicError(
                                    "Failed to convert fee to u128".to_string(),
                                ));
                            }
                        }

                        self.icrc_service.transfer_from(asset, args).await?;

                        return Ok(());
                    }
                    IcTransaction::Icrc1Transfer(tx) => {
                        let mut args: TransferArg = TransferArg::try_from(tx.clone())
                            .map_err(|e| CanisterError::HandleLogicError(e.to_string()))?;

                        // get asset
                        let asset = tx
                            .asset
                            .get_principal()
                            .map_err(|e| CanisterError::HandleLogicError(e.to_string()))?;

                        let transfer_amount = u128::try_from(args.amount.clone().0);
                        match transfer_amount {
                            Ok(amount) => {
                                let amount_subtract_fee = {
                                    let token_fee = self.icrc_service.fee(asset).await?;
                                    amount.checked_sub(token_fee as u128)
                                };
                                match amount_subtract_fee {
                                    Some(amount_subtract_fee) => {
                                        args.amount = Nat::from(amount_subtract_fee)
                                    }
                                    None => {
                                        return Err(CanisterError::HandleLogicError(
                                            "Failed to calculate fee".to_string(),
                                        ));
                                    }
                                }
                            }

                            Err(_) => {
                                return Err(CanisterError::HandleLogicError(
                                    "Failed to convert fee to u128".to_string(),
                                ));
                            }
                        }

                        self.icrc_service.transfer(asset, args).await?;

                        return Ok(());
                    }

                    _ => {
                        return Err(CanisterError::HandleLogicError(
                            "Unsupported IcTransaction".to_string(),
                        ));
                    }
                }
            }
            FromCallType::Wallet => {
                return Err(CanisterError::HandleLogicError(
                    "Unsupported from_call_type".to_string(),
                ));
            }
        }
    }
}
