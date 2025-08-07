use cashier_types::{
    dto::{
        action::{ActionDto, CreateActionInput},
        link::{CreateLinkInput, LinkDetailUpdateAssetInfoInput, LinkDto},
        user::UserDto,
    },
    error::CanisterError,
};

use crate::utils::{principal::TestUser, with_pocket_ic_context_sync};

// This test follows the example in: https://github.com/dfinity/ic/blob/HEAD/packages/pocket-ic/HOWTO.md#concurrent-update-calls
#[test]
fn test_request_lock_for_create_action() -> Result<(), ()> {
    with_pocket_ic_context_sync::<_, ()>(move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();

        let res: Result<UserDto, CanisterError> = ctx
            .update_call(ctx.cashier_backend_principal, caller, "create_user", ())
            .unwrap();

        assert!(res.is_ok());

        let _ = res.unwrap();

        let input = CreateLinkInput {
            title: "Test Link".to_string(),
            link_use_action_max_count: 1,
            asset_info: vec![LinkDetailUpdateAssetInfoInput {
                address: ctx.icp_ledger_principal.to_string(),
                chain: "IC".to_string(),
                label: "SEND_TIP_ASSET".to_string(),
                amount_per_link_use_action: 100_000_000,
            }],
            template: "Central".to_string(),
            link_type: "SendTip".to_string(),
            nft_image: None,
            link_image_url: None,
            description: Some("Test link for integration testing".to_string()),
        };

        let create_link_res: Result<LinkDto, CanisterError> = ctx
            .update_call(
                ctx.cashier_backend_principal,
                caller,
                "create_link",
                (input.clone(),),
            )
            .unwrap();
        let link = create_link_res.unwrap();

        let input = CreateActionInput {
            link_id: link.id,
            action_type: "CreateLink".to_string(),
        };

        // Act - submit 3 create_action calls and await them
        let msg_id = ctx.submit_call(
            ctx.cashier_backend_principal,
            caller,
            "create_action",
            (input.clone(),),
        );
        let msg_id_2 = ctx.submit_call(
            ctx.cashier_backend_principal,
            caller,
            "create_action",
            (input.clone(),),
        );

        let msg_id_3 = ctx.submit_call(
            ctx.cashier_backend_principal,
            caller,
            "create_action",
            (input.clone(),),
        );

        let action: Result<ActionDto, CanisterError> = ctx.await_call(msg_id).unwrap();
        let action_2: Result<ActionDto, CanisterError> = ctx.await_call(msg_id_2).unwrap();
        let action_3: Result<ActionDto, CanisterError> = ctx.await_call(msg_id_3).unwrap();

        // Assert

        assert!(action.is_ok());
        assert!(action_2.is_err());
        assert!(action_3.is_err());

        Ok(())
    })
}
