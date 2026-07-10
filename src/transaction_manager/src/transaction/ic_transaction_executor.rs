// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::icrc_token::{
    service::IcrcService,
    types::{Account, TransferArg, TransferFromArgs},
};
use crate::transaction::traits::TransactionExecutor;
use candid::Principal;
use cashier_backend_types::repository::asset::v1::Asset;
use cashier_backend_types::repository::transaction::v1::{
    FromCallType, IcTransaction, Icrc1Transfer, Protocol,
};
use cashier_backend_types::{
    error::CanisterError,
    repository::transaction::v1::{Icrc2TransferFrom, Transaction},
};
use std::pin::Pin;

#[derive(Clone)]
pub struct IcTransactionExecutor;

/// Builds the ledger canister address and `icrc2_transfer_from` call arguments
/// from a Icrc2TransferFrom transaction.
fn build_icrc2_transfer_from_arg(transaction: Icrc2TransferFrom) -> (Principal, TransferFromArgs) {
    let address = match transaction.asset {
        Asset::IC { address, .. } => address,
    };
    let from_account: Account = transaction.from.into();
    let to_account: Account = transaction.to.into();

    let transfer_arg = TransferFromArgs {
        from: from_account,
        to: to_account,
        amount: transaction.amount,
        fee: None,
        spender_subaccount: None,
        memo: None, // TODO
        created_at_time: None,
    };

    (address, transfer_arg)
}

/// Builds the ledger canister address and `icrc1_transfer` call arguments
/// from a Icrc1Transfer transaction.
fn build_icrc1_transfer_arg(transaction: Icrc1Transfer) -> (Principal, TransferArg) {
    let address = match transaction.asset {
        Asset::IC { address, .. } => address,
    };
    let from_account: Account = transaction.from.into();
    let to_account: Account = transaction.to.into();

    let transfer_arg = TransferArg {
        from_subaccount: from_account.subaccount,
        to: to_account,
        amount: transaction.amount,
        fee: None,
        memo: None, // TODO
        created_at_time: transaction.ts,
    };

    (address, transfer_arg)
}

impl IcTransactionExecutor {
    /// Execute ICRC-2 TransferFrom transaction
    /// # Arguments
    /// * `transaction` - The ICRC-2 TransferFrom transaction to be executed
    /// # Returns
    /// * `Result<(), CanisterError>` - Ok if successful, Err otherwise
    async fn execute_icrc2_transfer_from(
        transaction: Icrc2TransferFrom,
    ) -> Result<(), CanisterError> {
        let (address, transfer_arg) = build_icrc2_transfer_from_arg(transaction);

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

    /// Execute ICRC-1 Transfer transaction
    /// # Arguments
    /// * `transaction` - The ICRC-1 Transfer transaction to be executed
    /// # Returns
    /// * `Result<(), CanisterError>` - Ok if successful, Err otherwise
    async fn execute_icrc1_transfer(transaction: Icrc1Transfer) -> Result<(), CanisterError> {
        let (address, transfer_arg) = build_icrc1_transfer_arg(transaction);

        let icrc_service = IcrcService::new(address);
        let result = icrc_service.icrc_1_transfer(&transfer_arg).await?;

        let _block_id = result.map_err(|e| {
            CanisterError::CallCanisterFailed(format!(
                "Failed to transfer fee from link to wallet: {:?}",
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

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Nat;
    use cashier_backend_types::repository::common::Wallet;
    use cashier_common::test_utils::random_principal_id;
    use icrc_ledger_types::icrc1::transfer::Memo;
    use serde_bytes::ByteBuf;

    #[test]
    fn it_should_build_icrc2_transfer_from_arg_with_correct_address_and_amount() {
        let asset_address = random_principal_id();
        let transaction = Icrc2TransferFrom {
            from: Wallet::new(random_principal_id()),
            to: Wallet::new(random_principal_id()),
            spender: Wallet::new(random_principal_id()),
            asset: Asset::IC {
                address: asset_address,
            },
            amount: Nat::from(100u64),
            memo: Some(Memo(ByteBuf::from(vec![1, 2, 3, 4]))),
            ts: Some(1_700_000_000_000_000_000),
        };

        let (address, transfer_arg) = build_icrc2_transfer_from_arg(transaction);

        assert_eq!(address, asset_address);
        assert_eq!(transfer_arg.amount, Nat::from(100u64));
        assert_eq!(transfer_arg.memo, None, "memo is not forwarded yet (TODO)");
        assert_eq!(
            transfer_arg.created_at_time, None,
            "created_at_time is not forwarded yet (TODO)"
        );
    }

    #[test]
    fn it_should_build_icrc1_transfer_arg_with_correct_address_amount_and_created_at_time() {
        let asset_address = random_principal_id();
        let transaction = Icrc1Transfer {
            from: Wallet::new(random_principal_id()),
            to: Wallet::new(random_principal_id()),
            asset: Asset::IC {
                address: asset_address,
            },
            amount: Nat::from(200u64),
            memo: Some(Memo(ByteBuf::from(vec![5, 6, 7, 8]))),
            ts: Some(1_650_000_000_000_000_000),
        };

        let (address, transfer_arg) = build_icrc1_transfer_arg(transaction);

        assert_eq!(address, asset_address);
        assert_eq!(transfer_arg.amount, Nat::from(200u64));
        assert_eq!(transfer_arg.memo, None, "memo is not forwarded yet (TODO)");
        assert_eq!(
            transfer_arg.created_at_time,
            Some(1_650_000_000_000_000_000)
        );
    }
}
