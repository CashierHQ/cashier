// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use token_storage_types::token::{ChainTokenDetails, IcrcStandard};

use crate::{
    constant::{CK_BTC_PRINCIPAL, TESTICP_PRINCIPAL},
    utils::{principal::TestUser, with_pocket_ic_context},
};

#[tokio::test]
async fn it_should_get_token_by_id_with_two_supported_standards() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let client = ctx.new_token_storage_client(TestUser::TokenDeployer.get_principal());

        // Act
        let token_details_result = client
            .get_token_by_id(Principal::from_text(CK_BTC_PRINCIPAL).unwrap())
            .await
            .unwrap();

        // Assert
        assert!(token_details_result.is_ok());
        let token_details = token_details_result.unwrap();
        let details = token_details.details;
        match details {
            ChainTokenDetails::IC {
                ledger_id: _,
                index_id: _,
                fee: _,
                supported_standards: standards,
            } => {
                assert_eq!(standards, vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2]);
            }
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_get_token_by_id_with_one_supported_standard() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let client = ctx.new_token_storage_client(TestUser::TokenDeployer.get_principal());

        // Act
        let token_details_result = client
            .get_token_by_id(Principal::from_text(TESTICP_PRINCIPAL).unwrap())
            .await
            .unwrap();

        // Assert
        assert!(token_details_result.is_ok());
        let token_details = token_details_result.unwrap();
        let details = token_details.details;
        match details {
            ChainTokenDetails::IC {
                ledger_id: _,
                index_id: _,
                fee: _,
                supported_standards: standards,
            } => {
                assert_eq!(standards, vec![IcrcStandard::ICRC1]);
            }
        }

        Ok(())
    })
    .await
    .unwrap();
}
