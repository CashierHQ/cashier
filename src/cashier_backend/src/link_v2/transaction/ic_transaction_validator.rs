use crate::link_v2::transaction::traits::TransactionValidator;
use crate::services::ext::icrc_token::Service as IcrcService;
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        common::Asset,
        transaction::v1::{IcTransaction, Icrc1Transfer, Protocol, Transaction},
    },
};
use std::pin::Pin;

#[derive(Clone)]
pub struct IcTransactionValidator;

impl IcTransactionValidator {
    pub async fn validate_icrc1_transfer(
        &self,
        transaction: Icrc1Transfer,
    ) -> Result<(), CanisterError> {
        let address = match transaction.asset {
            Asset::IC { address, .. } => address,
        };

        let account = transaction.to.into();
        let icrc_service = IcrcService::new(address);
        let balance_res = icrc_service.icrc_1_balance_of(&account).await?;

        Ok(())
    }
}

impl TransactionValidator for IcTransactionValidator {
    fn validate(
        &self,
        transaction: Transaction,
    ) -> Pin<Box<dyn Future<Output = Result<(), CanisterError>>>> {
        let validator = self.clone();
        Box::pin(async move {
            match transaction.protocol {
                Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer)) => {
                    validator.validate_icrc1_transfer(icrc1_transfer).await
                }
                _ => Err(CanisterError::from(
                    "Unsupported transaction protocol for validation",
                )),
            }
        })
    }
}
