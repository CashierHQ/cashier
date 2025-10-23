use crate::services::ext::icrc_token::{Service as IcrcService, TransferArg};
use crate::{
    link_v2::transaction::traits::TransactionExecutor,
    services::ext::icrc_token::{Account, TransferFromArgs},
};
use candid::Nat;
use cashier_backend_types::repository::common::Asset;
use cashier_backend_types::repository::transaction::v1::{
    FromCallType, IcTransaction, Icrc1Transfer, Protocol,
};
use cashier_backend_types::{
    error::CanisterError,
    repository::transaction::v1::{Icrc2TransferFrom, Transaction},
};
use std::pin::Pin;

pub struct IcTransactionExecutor;

impl IcTransactionExecutor {
    async fn execute_icrc2_transfer_from(
        transaction: Icrc2TransferFrom,
    ) -> Result<(), CanisterError> {
        let address = match transaction.asset {
            Asset::IC { address, .. } => address,
        };
        let from_account: Account = transaction.from.into();
        let to_account: Account = transaction.to.into();

        let fee_amount = Nat::from(10_000u64); // TODO

        let transfer_arg = TransferFromArgs {
            from: from_account,
            to: to_account,
            amount: transaction.amount,
            fee: Some(fee_amount),
            spender_subaccount: None,
            memo: None, // TODO
            created_at_time: None,
        };

        let icrc_service = IcrcService::new(address);
        let result = icrc_service.icrc_2_transfer_from(&transfer_arg).await?;

        let _block_id = result.map_err(|e| {
            CanisterError::CallCanisterFailed(format!(
                "Failed to transfer fee from link creator to treasury: {:?}",
                e
            ))
        })?;

        Ok(())
    }

    async fn execute_icrc1_transfer(transaction: Icrc1Transfer) -> Result<(), CanisterError> {
        let address = match transaction.asset {
            Asset::IC { address, .. } => address,
        };
        let from_account: Account = transaction.from.into();
        let to_account: Account = transaction.to.into();

        let fee_amount = Nat::from(10_000u64); // TODO

        let transfer_arg = TransferArg {
            from_subaccount: from_account.subaccount,
            to: to_account,
            amount: transaction.amount,
            fee: Some(fee_amount),
            memo: None, // TODO
            created_at_time: transaction.ts,
        };

        let icrc_service = IcrcService::new(address);
        let result = icrc_service.icrc_1_transfer(&transfer_arg).await?;

        let _block_id = result.map_err(|e| {
            CanisterError::CallCanisterFailed(format!(
                "Failed to transfer fee from link creator to treasury: {:?}",
                e
            ))
        })?;

        Ok(())
    }
}

impl TransactionExecutor for IcTransactionExecutor {
    fn execute(
        &self,
        transaction: Transaction,
    ) -> Pin<Box<dyn Future<Output = Result<(), CanisterError>>>> {
        Box::pin(async move {
            match transaction.protocol {
                Protocol::IC(IcTransaction::Icrc2TransferFrom(tx)) => {
                    Self::execute_icrc2_transfer_from(tx).await
                }
                Protocol::IC(IcTransaction::Icrc1Transfer(tx)) => {
                    match transaction.from_call_type {
                        FromCallType::Canister => Self::execute_icrc1_transfer(tx).await,
                        FromCallType::Wallet => Err(CanisterError::from(
                            "ICRC-1 transfer from wallet is not supported",
                        )),
                    }
                }
                _ => Err(CanisterError::from(
                    "Unsupported protocol for IC Transaction Executor",
                )),
            }
        })
    }
}
