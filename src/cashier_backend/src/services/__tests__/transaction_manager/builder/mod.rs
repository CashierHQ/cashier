#[cfg(test)]
mod tests {
    use crate::core::action::types::TriggerTransactionInput;

    use crate::services::__tests__::tests::{generate_token_address, MockIcEnvironment};
    use crate::services::transaction_manager::builder::icrc112::approve_cashier_fee::ApproveCashierFeeBuilder;
    use crate::services::transaction_manager::builder::icrc112::TransactionBuilder;
    use crate::services::transaction_manager::builder::icrc112::{
        transfer_to_link_escrow_wallet::TransferToLinkEscrowWalletBuilder,
        trigger_transaction::TriggerTransactionBuilder,
    };
    use crate::utils::helper::to_subaccount;
    use base64::engine::general_purpose;
    use base64::Engine;
    use candid::{Decode, Nat, Principal};
    use faux::when;
    use icrc_ledger_types::icrc1::account::Account;
    use icrc_ledger_types::icrc1::transfer::TransferArg;
    use icrc_ledger_types::icrc2::approve::ApproveArgs;
    use uuid::Uuid;

    #[tokio::test]
    async fn test_trigger_transaction_builder() {
        let mut env = MockIcEnvironment::faux();
        let link_id = Uuid::new_v4().to_string();
        let action_id = Uuid::new_v4().to_string();
        let tx_id = Uuid::new_v4().to_string();

        let canister_id = Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap();

        when!(env.id).then_return(canister_id.clone());

        let builder = TriggerTransactionBuilder {
            link_id: link_id.clone(),
            action_id: action_id.clone(),
            tx_id: tx_id.clone(),
            ic_env: &env,
        };

        let request = builder.build();

        let decoded_bytes = general_purpose::STANDARD.decode(request.arg).unwrap();
        let args = Decode!(&decoded_bytes, TriggerTransactionInput);

        assert!(args.is_ok());
        assert!(args.as_ref().unwrap().action_id == action_id);
        assert!(args.as_ref().unwrap().link_id == link_id);
        assert!(args.as_ref().unwrap().transaction_id == tx_id.clone());
        assert_eq!(request.method, "trigger_transaction");
        assert_eq!(request.nonce, Some(tx_id.clone()));
        assert_eq!(request.canister_id, canister_id.to_text());
    }

    #[tokio::test]
    async fn test_transfer_to_link_escrow_wallet_builder() {
        let mut env = MockIcEnvironment::faux();
        let link_id = Uuid::new_v4().to_string();
        let tx_id = Uuid::new_v4().to_string();
        let canister_id = Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap();
        let token_canister_id = generate_token_address();

        when!(env.id).then_return(canister_id);

        let expected_amount = Nat::from(100_000_000u64);
        let expected_to_account = Account {
            owner: canister_id.clone(),
            subaccount: Some(to_subaccount(link_id.clone())),
        };

        let builder = TransferToLinkEscrowWalletBuilder {
            link_id: link_id.clone(),
            token_address: token_canister_id.to_text(),
            transfer_amount: 100_000_000u64,
            tx_id: tx_id.clone(),
            ic_env: &env,
        };

        let request = builder.build();
        let decoded_bytes = general_purpose::STANDARD.decode(request.arg).unwrap();
        let args = Decode!(&decoded_bytes, TransferArg);

        assert_eq!(request.method, "icrc1_transfer");
        assert_eq!(request.nonce, Some(tx_id.clone()));
        assert_eq!(request.canister_id, token_canister_id.to_text());
        assert_eq!(args.as_ref().unwrap().amount, expected_amount);
        assert_eq!(args.as_ref().unwrap().to, expected_to_account);
    }

    #[tokio::test]
    async fn test_approve_cashier_fee_builder() {
        let mut env = MockIcEnvironment::faux();
        let tx_id = Uuid::new_v4().to_string();
        let canister_id = Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap();
        let token_canister_id = generate_token_address();

        when!(env.id).then_return(canister_id);

        let expected_amount = Nat::from(100_000_000u64);
        let spender_account = Account {
            owner: canister_id.clone(),
            subaccount: None,
        };

        let builder = ApproveCashierFeeBuilder {
            token_address: token_canister_id.to_text(),
            fee_amount: 100_000_000u64,
            tx_id: tx_id.clone(),
            ic_env: &env,
        };

        let request = builder.build();
        let decoded_bytes = general_purpose::STANDARD.decode(request.arg).unwrap();
        let args = Decode!(&decoded_bytes, ApproveArgs);
        assert_eq!(request.method, "icrc2_approve");
        assert_eq!(request.nonce, Some(tx_id.clone()));
        assert_eq!(request.canister_id, token_canister_id.to_text());
        assert_eq!(args.as_ref().unwrap().amount, expected_amount);
        assert_eq!(args.as_ref().unwrap().spender, spender_account);
    }
}
