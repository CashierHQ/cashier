// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use token_storage_types::{
    TokenId,
    error::CanisterError,
    token::{AddTokenInput, ChainTokenDetails, IcrcStandard, RuneInfo},
};

use crate::{
    constant::{CK_BTC_PRINCIPAL, TESTICP_PRINCIPAL},
    utils::{principal::TestUser, with_pocket_ic_context},
};

#[tokio::test]
async fn it_should_fail_do_get_token_by_id_due_to_token_not_found() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let client = ctx.new_token_storage_client(TestUser::User1.get_principal());
        let missing_ledger_id = Principal::management_canister();

        // Act
        let result = client.get_token_by_id(missing_ledger_id).await.unwrap();

        // Assert
        assert!(result.is_err());
        match result {
            Err(CanisterError::NotFound(message)) => {
                assert!(message.contains("not found in registry"));
            }
            _ => panic!("Expected NotFound error, got {:?}", result),
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_do_get_token_by_id_with_two_supported_standards() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let client = ctx.new_token_storage_client(TestUser::TokenDeployer.get_principal());

        // Act
        let result = client
            .get_token_by_id(Principal::from_text(CK_BTC_PRINCIPAL).unwrap())
            .await
            .unwrap();

        // Assert
        assert!(result.is_ok());
        let token_details = result.unwrap();
        match token_details.details {
            ChainTokenDetails::IC {
                supported_standards,
                ..
            } => {
                assert_eq!(
                    supported_standards,
                    vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2]
                );
            }
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_do_get_token_by_id_with_one_supported_standard() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let client = ctx.new_token_storage_client(TestUser::TokenDeployer.get_principal());

        // Act
        let result = client
            .get_token_by_id(Principal::from_text(TESTICP_PRINCIPAL).unwrap())
            .await
            .unwrap();

        // Assert
        assert!(result.is_ok());
        let token_details = result.unwrap();
        match token_details.details {
            ChainTokenDetails::IC {
                supported_standards,
                ..
            } => {
                assert_eq!(supported_standards, vec![IcrcStandard::ICRC1]);
            }
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_do_get_token_by_id_with_rune_metadata() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let client = ctx.new_token_storage_client(TestUser::User1.get_principal());
        let doge_token = ctx.icrc_token_map.get("DOGE").unwrap();
        let add_input = AddTokenInput {
            token_id: TokenId::IC {
                ledger_id: *doge_token,
            },
            index_id: None,
            is_rune: Some(true),
            rune_info: Some(RuneInfo {
                rune_id: "UNCOMMON•GOODS".to_string(),
                token_id: "omnity-rune-id".to_string(),
            }),
        };
        client.user_add_token(add_input).await.unwrap().unwrap();

        // Act
        let result = client.get_token_by_id(*doge_token).await.unwrap();

        // Assert
        assert!(result.is_ok());
        let token_details = result.unwrap();
        assert_eq!(token_details.is_rune, Some(true));
        assert_eq!(
            token_details.rune_info,
            Some(RuneInfo {
                rune_id: "UNCOMMON•GOODS".to_string(),
                token_id: "omnity-rune-id".to_string(),
            })
        );

        Ok(())
    })
    .await
    .unwrap();
}
