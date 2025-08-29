//! LinkService trait decomposition
//!
//! This file only declares the traits – the existing methods in
//! `link/v2.rs` will be migrated into `impl` blocks incrementally.

use candid::Principal;
use cashier_backend_types::dto::action::ActionDto;
use cashier_backend_types::dto::action::{
    CreateActionAnonymousInput, CreateActionInput, ProcessActionAnonymousInput, ProcessActionInput,
    UpdateActionInput,
};
use cashier_backend_types::dto::link::{
    CreateLinkInput, LinkDetailUpdateInput, LinkGetUserStateInput, LinkGetUserStateOutput,
    LinkStateMachineGoto, LinkUpdateUserStateInput, UserStateMachineGoto,
};
use cashier_backend_types::error::CanisterError;
use cashier_backend_types::repository::action::v1::Action;
use cashier_backend_types::repository::action::v1::ActionType;
use cashier_backend_types::repository::asset_info::AssetInfo;
use cashier_backend_types::repository::common::Asset;
use cashier_backend_types::repository::intent::v2::Intent;
use cashier_backend_types::repository::link::v1::{Link, LinkType, Template};
use cashier_backend_types::repository::link_action::v1::LinkAction;

use std::collections::HashMap;

use candid::Nat;

// ---------- 1. Link lifecycle ----------
pub trait LinkStateMachine {
    async fn create_link(
        &mut self,
        caller: Principal,
        input: CreateLinkInput,
    ) -> Result<Link, CanisterError>;
    async fn handle_link_state_transition(
        &mut self,
        link_id: &str,
        goto: LinkStateMachineGoto,
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
        &mut self,
        link_id: &str,
        action_type: &ActionType,
        user_id: Principal,
        goto: &UserStateMachineGoto,
    ) -> Result<LinkAction, CanisterError>;

    fn link_get_user_state(
        &self,
        caller: Principal,
        input: &LinkGetUserStateInput,
    ) -> Result<Option<LinkGetUserStateOutput>, CanisterError>;

    fn link_update_user_state(
        &mut self,
        caller: Principal,
        input: &LinkUpdateUserStateInput,
    ) -> Result<Option<LinkGetUserStateOutput>, CanisterError>;
}

// ---------- 2. Action flow ----------
pub trait ActionFlow {
    async fn create_action(
        &mut self,
        ts: u64,
        input: &CreateActionInput,
        caller: Principal,
    ) -> Result<ActionDto, CanisterError>;
    async fn process_action(
        &mut self,
        input: &ProcessActionInput,
        caller: Principal,
    ) -> Result<ActionDto, CanisterError>;
    async fn update_action(
        &mut self,
        input: &UpdateActionInput,
        caller: Principal,
    ) -> Result<ActionDto, CanisterError>;
    async fn create_action_anonymous(
        &mut self,
        ts: u64,
        input: &CreateActionAnonymousInput,
    ) -> Result<ActionDto, CanisterError>;
    async fn process_action_anonymous(
        &mut self,
        caller: Principal,
        input: &ProcessActionAnonymousInput,
    ) -> Result<ActionDto, CanisterError>;
}

// ---------- 3. Intent assembler ----------
pub trait IntentAssembler {
    async fn assemble_intents(
        &self,
        link_id: &str,
        action_type: &ActionType,
        caller: Principal,
        fee_map: &HashMap<Principal, Nat>,
    ) -> Result<Vec<Intent>, CanisterError>;
    fn get_assets_for_action(
        &self,
        link_id: &str,
        action_type: &ActionType,
    ) -> Result<Vec<Asset>, CanisterError>;
}

// ---------- 4. Validation helpers ----------
pub trait LinkValidation {
    fn link_validate_user_create_action(
        &self,
        link_id: &str,
        action_type: &ActionType,
        user_id: Principal,
    ) -> Result<(), CanisterError>;

    fn link_validate_user_update_action(
        &self,
        action: &Action,
        user_id: Principal,
    ) -> Result<(), CanisterError>;

    fn is_link_creator(&self, caller: &Principal, link_id: &str) -> bool;

    async fn check_link_asset_left(&self, link: &Link) -> Result<bool, CanisterError>;

    fn validate_add_asset_with_link_type(&self, link: &Link, asset_infos: &[AssetInfo]) -> bool;
}
