// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use ic_mple_client::CanisterClientError;
use token_storage_types::{
    TokenId,
    token::{AddTokenInput, RuneInfo},
};

use crate::utils::{principal::TestUser, with_pocket_ic_context};

fn fixture_of_rune_info(rune_id: &str, token_id: &str) -> RuneInfo {
    RuneInfo {
        rune_id: rune_id.to_string(),
        token_id: token_id.to_string(),
        icon: None,
    }
}

#[tokio::test]
async fn it_should_fail_do_user_add_token_due_to_missing_rune_info() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let client = ctx.new_token_storage_client(caller);
        let doge_token = ctx.icrc_token_map.get("DOGE").unwrap();
        let input = AddTokenInput {
            token_id: TokenId::IC {
                ledger_id: *doge_token,
            },
            index_id: None,
            is_rune: Some(true),
            rune_info: None,
        };

        // Act
        let result = client.user_add_token(input).await;

        // Assert
        assert!(result.is_err());
        match result {
            Err(CanisterClientError::PocketIcTestError(err)) => {
                assert!(
                    err.reject_message
                        .contains("rune_info is required when is_rune is true")
                );
            }
            _ => panic!("Expected PocketIcTestError, got {:?}", result),
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_do_user_add_token_due_to_empty_rune_id() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let client = ctx.new_token_storage_client(caller);
        let doge_token = ctx.icrc_token_map.get("DOGE").unwrap();
        let input = AddTokenInput {
            token_id: TokenId::IC {
                ledger_id: *doge_token,
            },
            index_id: None,
            is_rune: Some(true),
            rune_info: Some(fixture_of_rune_info("", "omnity-rune-token-id")),
        };

        // Act
        let result = client.user_add_token(input).await;

        // Assert
        assert!(result.is_err());
        match result {
            Err(CanisterClientError::PocketIcTestError(err)) => {
                assert!(
                    err.reject_message
                        .contains("rune_info.rune_id and rune_info.token_id must not be empty")
                );
            }
            _ => panic!("Expected PocketIcTestError, got {:?}", result),
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_do_user_add_token_with_valid_rune_info() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let client = ctx.new_token_storage_client(caller);
        let doge_token = ctx.icrc_token_map.get("DOGE").unwrap();
        let input = AddTokenInput {
            token_id: TokenId::IC {
                ledger_id: *doge_token,
            },
            index_id: None,
            is_rune: Some(true),
            rune_info: Some(fixture_of_rune_info(
                "UNCOMMON•GOODS",
                "omnity-rune-token-id",
            )),
        };

        // Act
        let result = client.user_add_token(input).await.unwrap();
        let list_result = client.list_tokens().await.unwrap().unwrap();

        // Assert
        assert!(result.is_ok());
        let doge_in_list = list_result
            .tokens
            .iter()
            .find(|token| {
                token.id
                    == TokenId::IC {
                        ledger_id: *doge_token,
                    }
            })
            .expect("DOGE token should appear in list");
        assert_eq!(doge_in_list.is_rune, Some(true));
        assert_eq!(
            doge_in_list.rune_info,
            Some(fixture_of_rune_info(
                "UNCOMMON•GOODS",
                "omnity-rune-token-id",
            ))
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_do_user_add_non_rune_token_without_rune_info() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let client = ctx.new_token_storage_client(caller);
        let doge_token = ctx.icrc_token_map.get("DOGE").unwrap();
        let input = AddTokenInput {
            token_id: TokenId::IC {
                ledger_id: *doge_token,
            },
            index_id: None,
            is_rune: None,
            rune_info: None,
        };

        // Act
        let result = client.user_add_token(input).await.unwrap();
        let list_result = client.list_tokens().await.unwrap().unwrap();

        // Assert
        assert!(result.is_ok());
        let doge_in_list = list_result
            .tokens
            .iter()
            .find(|token| {
                token.id
                    == TokenId::IC {
                        ledger_id: *doge_token,
                    }
            })
            .expect("DOGE token should appear in list");
        assert_eq!(doge_in_list.is_rune, None);
        assert_eq!(doge_in_list.rune_info, None);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_do_user_add_token_due_to_anonymous_caller() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let client = ctx.new_token_storage_client(candid::Principal::anonymous());
        let doge_token = ctx.icrc_token_map.get("DOGE").unwrap();
        let input = AddTokenInput {
            token_id: TokenId::IC {
                ledger_id: *doge_token,
            },
            index_id: None,
            is_rune: None,
            rune_info: None,
        };

        // Act
        let result = client.user_add_token(input).await;

        // Assert
        assert!(result.is_err());
        match result {
            Err(CanisterClientError::PocketIcTestError(err)) => {
                assert!(err.reject_message.contains("AnonimousUserNotAllowed"));
            }
            _ => panic!("Expected PocketIcTestError, got {:?}", result),
        }

        Ok(())
    })
    .await
    .unwrap();
}
