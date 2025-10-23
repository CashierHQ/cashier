use crate::services::ext::icrc_token::Service as IcrcService;
use crate::{
    link_v2::transaction::traits::TransactionValidator, services::ext::icrc_token::AllowanceArgs,
};
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        common::Asset,
        transaction::v1::{
            FromCallType, IcTransaction, Icrc1Transfer, Icrc2Approve, Protocol, Transaction,
        },
    },
};
use std::pin::Pin;

pub struct IcTransactionValidator;

impl IcTransactionValidator {
    pub async fn validate_icrc1_transfer(transaction: Icrc1Transfer) -> Result<(), CanisterError> {
        let address = match transaction.asset {
            Asset::IC { address, .. } => address,
        };

        let account = transaction.to.into();
        let icrc_service = IcrcService::new(address);
        let balance_res = icrc_service.icrc_1_balance_of(&account).await?;

        if balance_res < transaction.amount {
            return Err(CanisterError::from(
                "Insufficient balance for ICRC-1 transfer",
            ));
        }

        Ok(())
    }

    pub async fn validate_icrc2_approve(transaction: Icrc2Approve) -> Result<(), CanisterError> {
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
        let allowance_res = icrc_service.icrc_2_allowance(&allowance_args).await?;

        if allowance_res.allowance < transaction.amount {
            return Err(CanisterError::from(
                "Insufficient allowance for ICRC-2 approve",
            ));
        }

        Ok(())
    }
}

impl TransactionValidator for IcTransactionValidator {
    fn validate_success(
        &self,
        transaction: Transaction,
    ) -> Pin<Box<dyn Future<Output = Result<(), CanisterError>>>> {
        Box::pin(async move {
            match transaction.protocol {
                Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer)) => {
                    match transaction.from_call_type {
                        FromCallType::Wallet => Self::validate_icrc1_transfer(icrc1_transfer).await,
                        FromCallType::Canister => Err(CanisterError::from(
                            "ICRC-1 transfer from canister not supported for validation",
                        )),
                    }
                }
                Protocol::IC(IcTransaction::Icrc2Approve(icrc2_approve)) => {
                    match transaction.from_call_type {
                        FromCallType::Wallet => Self::validate_icrc2_approve(icrc2_approve).await,
                        FromCallType::Canister => Err(CanisterError::from(
                            "ICRC-2 approve from canister not supported for validation",
                        )),
                    }
                }
                _ => Err(CanisterError::from(
                    "Unsupported transaction protocol for validation",
                )),
            }
        })
    }
}
