// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repository::{
    action::v1::{Action, ActionState, ActionType},
    intent::v2::Intent,
    link_action::v1::LinkUserState,
};

#[derive(Debug, Clone)]
pub struct TemporaryAction {
    pub id: String,
    pub r#type: ActionType,
    pub state: ActionState,
    pub creator: String,
    pub link_id: String,
    pub intents: Vec<Intent>,
    pub default_link_user_state: Option<LinkUserState>,
}

impl TemporaryAction {
    pub fn as_action(&self) -> Action {
        Action {
            id: self.id.clone(),
            r#type: self.r#type.clone(),
            state: self.state.clone(),
            creator: self.creator.clone(),
            link_id: self.link_id.clone(),
        }
    }
}

// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::CandidType;
use serde::Deserialize;

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct PaginateInput {
    pub offset: usize,
    pub limit: usize,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct FilterInput {
    pub order_by: String,
    pub start_time: Option<u64>,
    pub end_time: Option<u64>,
}

impl Default for FilterInput {
    fn default() -> Self {
        Self {
            order_by: "desc".to_string(),
            start_time: None,
            end_time: None,
        }
    }
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct PaginateResultMetadata {
    pub total: usize,
    pub offset: usize,
    pub limit: usize,
    pub is_next: bool,
    pub is_prev: bool,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct PaginateResult<T> {
    pub data: Vec<T>,
    pub metadata: PaginateResultMetadata,
}

impl<T> PaginateResult<T> {
    pub fn new(data: Vec<T>, metadata: PaginateResultMetadata) -> Self {
        Self { data, metadata }
    }

    pub fn map<U, F>(self, f: F) -> PaginateResult<U>
    where
        F: FnMut(T) -> U,
    {
        PaginateResult {
            data: self.data.into_iter().map(f).collect(),
            metadata: self.metadata,
        }
    }
}

impl<T> Default for PaginateResult<T> {
    fn default() -> Self {
        Self {
            data: Vec::new(),
            metadata: PaginateResultMetadata::default(),
        }
    }
}

impl PaginateResultMetadata {
    pub fn new(total: usize, offset: usize, limit: usize, is_next: bool, is_prev: bool) -> Self {
        Self {
            total,
            offset,
            limit,
            is_next,
            is_prev,
        }
    }
}

impl Default for PaginateInput {
    fn default() -> Self {
        Self {
            offset: 0,
            limit: 10,
        }
    }
}

impl Default for PaginateResultMetadata {
    fn default() -> Self {
        Self {
            total: 0,
            offset: 0,
            limit: 10,
            is_next: false,
            is_prev: false,
        }
    }
}
