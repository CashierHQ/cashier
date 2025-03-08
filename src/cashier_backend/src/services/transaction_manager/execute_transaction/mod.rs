use cashier_types::{FromCallType, IcTransaction, Transaction};
use icrc_ledger_types::icrc2::transfer_from::TransferFromArgs;

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
                    IcTransaction::Icrc2TransferFrom(tx) => {
                        let args: TransferFromArgs = TransferFromArgs::try_from(tx.clone())
                            .map_err(|e| CanisterError::HandleLogicError(e.to_string()))?;

                        let asset = tx
                            .asset
                            .get_principal()
                            .map_err(|e| CanisterError::HandleLogicError(e.to_string()))?;

                        self.icrc_service.transfer_from(asset, args).await?;

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
