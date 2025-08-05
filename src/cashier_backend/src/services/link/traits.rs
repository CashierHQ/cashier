//! LinkService trait decomposition
//!
//! This file only declares the traits – the existing methods in
//! `link/v2.rs` will be migrated into `impl` blocks incrementally.

use async_trait::async_trait;
use candid::Principal;
use cashier_types::dto::action::ActionDto;
use cashier_types::dto::action::{
    CreateActionAnonymousInput, CreateActionInput, ProcessActionAnonymousInput, ProcessActionInput,
    UpdateActionInput,
};
use cashier_types::dto::link::{
    CreateLinkInput, LinkDetailUpdateInput, LinkGetUserStateInput, LinkGetUserStateOutput,
    LinkUpdateUserStateInput, UserStateMachineGoto,
};
use cashier_types::error::CanisterError;
use cashier_types::repository::action::v1::Action;
use cashier_types::repository::action::v1::ActionType;
use cashier_types::repository::asset_info::AssetInfo;
use cashier_types::repository::common::Asset;
use cashier_types::repository::intent::v2::Intent;
use cashier_types::repository::link::v1::{Link, LinkType, Template};
use cashier_types::repository::link_action::v1::LinkAction;

use std::collections::HashMap;

use candid::Nat;

// ---------- 1. Link lifecycle ----------
#[async_trait(?Send)]
pub trait LinkStateMachine {
    async fn create_link(
        &self,
        caller: String,
        input: CreateLinkInput,
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
    ) -> Result<(Template, LinkType), CanisterError>;

    fn prefetch_params_add_asset(
        &self,
        params: &LinkDetailUpdateInput,
    ) -> Result<(u64, Vec<AssetInfo>), CanisterError>;

    fn prefetch_create_action(&self, link: &Link) -> Result<Option<Action>, CanisterError>;

    fn prefetch_withdraw_action(&self, link: &Link) -> Result<Option<Action>, CanisterError>;
}

pub trait LinkUserStateMachine {
    fn handle_user_link_state_machine(
        &self,
        link_id: &str,
        action_type: &str,
        user_id: &str,
        goto: &UserStateMachineGoto,
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

    fn link_validate_user_update_action(
        &self,
        action: &Action,
        user_id: &str,
    ) -> Result<(), CanisterError>;

    fn is_link_creator(&self, caller: &str, link_id: &str) -> bool;

    async fn check_link_asset_left(&self, link: &Link) -> Result<bool, CanisterError>;
    
    fn validate_add_asset_with_link_type(&self, link: &Link, asset_infos: &[AssetInfo]) -> bool;
}
