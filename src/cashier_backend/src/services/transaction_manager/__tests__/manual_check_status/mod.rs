#[cfg(test)]
mod tests {
    use async_trait::async_trait;
    use candid::Principal;
    use cashier_types::{Transaction, TransactionState};

    use crate::{
        services::{
            runtime::{IcEnvironment, MockIcEnvironment},
            transaction_manager::{
                __tests__::tests::{create_dummy_transaction, generate_random_principal, Dummy},
                manual_check_status::ManualCheckStatusService,
            },
        },
        utils::icrc::IcrcService,
    };

    #[tokio::test]
    async fn test_execute_transaction_processing() {
        let icrc_service = IcrcService::new(Principal::anonymous());
        let env = MockIcEnvironment {
            time: 1000,
            caller: generate_random_principal(),
            canister_id: Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap(),
        };
        let service = ManualCheckStatusService::new(icrc_service, env);

        let transaction = create_dummy_transaction(TransactionState::Processing);
        let result = service.execute(&transaction).await;
        assert_eq!(result.unwrap(), TransactionState::Fail);
    }
}
