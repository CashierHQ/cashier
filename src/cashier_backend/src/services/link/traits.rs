//! LinkService trait decomposition
//!
//! This file only declares the traits – the existing methods in
//! `link/v2.rs` will be migrated into `impl` blocks incrementally.

use async_trait::async_trait;
use candid::Principal;
use cashier_types::asset_info::AssetInfo;
use std::collections::HashMap;

use crate::core::action::types::{
    ActionDto, CreateActionAnonymousInput, CreateActionInput, ProcessActionAnonymousInput,
    ProcessActionInput,
};
use crate::core::link::types::{
    LinkDetailUpdateInput, LinkGetUserStateInput, LinkGetUserStateOutput, LinkUpdateUserStateInput,
    UpdateActionInput,
};
use crate::types::error::CanisterError;
use candid::Nat;
use cashier_types::action::v1::ActionType;
use cashier_types::common::Asset;
use cashier_types::intent::v2::Intent;
use cashier_types::intent::v2::IntentTask;
use cashier_types::link::v1::Link;
use cashier_types::link_action::v1::LinkAction;

// ---------- 1. Link lifecycle ----------
#[async_trait(?Send)]
pub trait LinkStateMachine {
    async fn create_link(
        &self,
        caller: String,
        input: crate::core::link::types::CreateLinkInput,
    ) -> Result<Link, CanisterError>;
    async fn handle_link_state_transition(
        &self,
        link_id: &str,
        goto: &str,
        params: Option<LinkDetailUpdateInput>,
    ) -> Result<Link, CanisterError>;

    fn is_props_changed(
        &self,
        whitelist_props: &[String],
        params: &LinkDetailUpdateInput,
        link: &Link,
    ) -> bool;

    // ---- convenience helpers that operate on link metadata ----
    fn prefetch_template(
        &self,
        params: &LinkDetailUpdateInput,
    ) -> Result<
        (
            cashier_types::link::v1::Template,
            cashier_types::link::v1::LinkType,
        ),
        CanisterError,
    >;

    fn prefetch_params_add_asset(
        &self,
        params: &LinkDetailUpdateInput,
    ) -> Result<(u64, Vec<cashier_types::asset_info::AssetInfo>), CanisterError>;

    fn prefetch_create_action(
        &self,
        link: &Link,
    ) -> Result<Option<cashier_types::action::v1::Action>, CanisterError>;

    fn prefetch_withdraw_action(
        &self,
        link: &Link,
    ) -> Result<Option<cashier_types::action::v1::Action>, CanisterError>;
}

pub trait LinkUserStateMachine {
    fn handle_user_link_state_machine(
        &self,
        link_id: &str,
        action_type: &str,
        user_id: &str,
        goto: &crate::core::link::types::UserStateMachineGoto,
    ) -> Result<LinkAction, CanisterError>;

    fn link_get_user_state(
        &self,
        caller: &Principal,
        input: &LinkGetUserStateInput,
    ) -> Result<Option<LinkGetUserStateOutput>, CanisterError>;

    fn link_update_user_state(
        &self,
        caller: &Principal,
        input: &LinkUpdateUserStateInput,
    ) -> Result<Option<LinkGetUserStateOutput>, CanisterError>;
}

// ---------- 2. Action flow ----------
#[async_trait(?Send)]
pub trait ActionFlow {
    async fn create_action(
        &self,
        input: &CreateActionInput,
        caller: &Principal,
    ) -> Result<ActionDto, CanisterError>;
    async fn process_action(
        &self,
        input: &ProcessActionInput,
        caller: &Principal,
    ) -> Result<ActionDto, CanisterError>;
    async fn update_action(
        &self,
        input: &UpdateActionInput,
        caller: &Principal,
    ) -> Result<ActionDto, CanisterError>;
    async fn create_action_anonymous(
        &self,
        input: &CreateActionAnonymousInput,
    ) -> Result<ActionDto, CanisterError>;
    async fn process_action_anonymous(
        &self,
        input: &ProcessActionAnonymousInput,
    ) -> Result<ActionDto, CanisterError>;
}

// ---------- 3. Intent assembler ----------
#[async_trait(?Send)]
pub trait IntentAssembler {
    async fn assemble_intents(
        &self,
        link_id: &str,
        action_type: &ActionType,
        caller: &Principal,
        fee_map: &HashMap<String, Nat>,
    ) -> Result<Vec<Intent>, CanisterError>;
    fn get_assets_for_action(
        &self,
        link_id: &str,
        action_type: &ActionType,
    ) -> Result<Vec<Asset>, CanisterError>;

    // helper builders & lookup
    fn create_basic_intent(&self, task: IntentTask, label: String) -> Intent;
    fn create_fee_intent(&self) -> Intent;
    fn look_up_intent(
        &self,
        link: &Link,
        action_type: &ActionType,
    ) -> Result<Option<Vec<Intent>>, CanisterError>;
}

// ---------- 4. Validation helpers ----------
#[async_trait(?Send)]
pub trait LinkValidation {
    fn link_validate_user_create_action(
        &self,
        link_id: &str,
        action_type: &ActionType,
        user_id: &str,
    ) -> Result<(), CanisterError>;

    async fn link_validate_user_create_action_async(
        &self,
        link_id: &str,
        action_type: &ActionType,
        user_id: &str,
        caller: &Principal,
    ) -> Result<(), CanisterError>;

    fn link_validate_user_update_action(
        &self,
        action: &cashier_types::action::v1::Action,
        user_id: &str,
    ) -> Result<(), CanisterError>;

    async fn link_validate_user_update_action_async(
        &self,
        action: &cashier_types::action::v1::Action,
        user_id: &str,
        caller: &Principal,
    ) -> Result<(), CanisterError>;

    async fn link_validate_balance_with_asset_info(
        &self,
        action_type: &ActionType,
        link_id: &str,
        caller: &Principal,
    ) -> Result<(), CanisterError>;
    fn is_link_creator(&self, caller: &str, link_id: &str) -> bool;
    fn is_link_exist(&self, link_id: &str) -> bool;

    async fn check_link_asset_left(&self, link: &Link) -> Result<bool, CanisterError>;
    fn validate_add_asset_with_link_type(&self, link: &Link, asset_infos: &[AssetInfo]) -> bool;
}
