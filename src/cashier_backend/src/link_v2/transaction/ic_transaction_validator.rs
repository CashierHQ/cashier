use crate::services::ext::icrc_token::Service as IcrcService;
use crate::{
    link_v2::transaction::traits::TransactionValidator, services::ext::icrc_token::AllowanceArgs,
};
use cashier_backend_types::repository::{
    common::Asset,
    transaction::v1::{
        FromCallType, IcTransaction, Icrc1Transfer, Icrc2Approve, Protocol, Transaction,
    },
};
use std::pin::Pin;

pub struct IcTransactionValidator;

impl IcTransactionValidator {
    pub async fn validate_icrc1_transfer(transaction: Icrc1Transfer) -> Result<(), String> {
        let address = match transaction.asset {
            Asset::IC { address, .. } => address,
        };

        let account = transaction.to.into();
        let icrc_service = IcrcService::new(address);
        let balance_res = icrc_service
            .icrc_1_balance_of(&account)
            .await
            .map_err(|e| format!("Query icrc1 balance failed for canister {}: {}", address, e))?;

        if balance_res < transaction.amount {
            return Err(format!("Insufficient balance for {} asset", address));
        }

        Ok(())
    }

    pub async fn validate_icrc2_approve(transaction: Icrc2Approve) -> Result<(), String> {
        let address = match transaction.asset {
            Asset::IC { address, .. } => address,
        };
        let from_account = transaction.from.into();
        let spender_account = transaction.spender.into();
        let icrc_service = IcrcService::new(address);
        let allowance_args = AllowanceArgs {
            account: from_account,
            spender: spender_account,
        };
        let allowance_res = icrc_service
            .icrc_2_allowance(&allowance_args)
            .await
            .map_err(|e| {
                format!(
                    "Query icrc2 allowance failed for canister {}: {}",
                    address, e
                )
            })?;

        if allowance_res.allowance < transaction.amount {
            return Err(format!("Insufficient allowance for {} asset", address));
        }

        Ok(())
    }
}

impl TransactionValidator for IcTransactionValidator {
    fn validate_success(
        &self,
        transaction: Transaction,
    ) -> Pin<Box<dyn Future<Output = Result<(), String>>>> {
        Box::pin(async move {
            match transaction.protocol {
                Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer)) => {
                    match transaction.from_call_type {
                        FromCallType::Wallet => Self::validate_icrc1_transfer(icrc1_transfer).await,
                        FromCallType::Canister => {
                            Err("ICRC-1 transfer from canister not supported for validation"
                                .to_string())
                        }
                    }
                }
                Protocol::IC(IcTransaction::Icrc2Approve(icrc2_approve)) => {
                    match transaction.from_call_type {
                        FromCallType::Wallet => Self::validate_icrc2_approve(icrc2_approve).await,
                        FromCallType::Canister => {
                            Err("ICRC-2 approve from canister not supported for validation"
                                .to_string())
                        }
                    }
                }
                _ => Err("Unsupported transaction protocol for validation".to_string()),
            }
        })
    }
}
