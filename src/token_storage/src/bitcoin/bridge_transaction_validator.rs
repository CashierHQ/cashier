use candid::Principal;
use token_storage_types::{
    bitcoin::bridge_transaction::{BridgeTransactionMapper, BridgeType},
    dto::bitcoin::CreateBridgeTransactionInputArg,
    error::CanisterError,
};

use crate::repository::{
    Repositories, user_bridge_address::UserBridgeAddressRepository,
    user_bridge_transaction::UserBridgeTransactionRepository,
};

pub struct BridgeTransactionValidator<R: Repositories> {
    repository: UserBridgeTransactionRepository<R::UserBridgeTransaction>,
}

impl<R: Repositories> BridgeTransactionValidator<R> {
    pub fn new(repositories: &R) -> Self {
        Self {
            repository: repositories.user_bridge_transaction(),
        }
    }

    pub fn validate_create_bridge_transaction(
        &self,
        user_id: Principal,
        input: &CreateBridgeTransactionInputArg,
    ) -> Result<(), CanisterError> {
        if input.bridge_type == BridgeType::Import {
            let new_bridge_transaction = BridgeTransactionMapper::from_create_input(input.clone())?;

            if self
                .repository
                .get_bridge_transaction_by_id(user_id, &new_bridge_transaction.bridge_id.as_str())
                .is_some()
            {
                return Err(CanisterError::ValidationErrors(
                    "A bridge transaction with the same btc_txid already exists".to_string(),
                ));
            }
        }

        Ok(())
    }
}
