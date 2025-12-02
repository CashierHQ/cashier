// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_macros::storable;
use std::fmt;

pub type LinkKey = String;

pub type ActionKey = String;

pub type ActionTypeKey = String;

pub type IntentKey = String;

pub type TransactionKey = String;

pub struct UserActionKey {
    pub user_id: Principal,
    pub action_id: String,
}

impl UserActionKey {
    pub fn to_str(&self) -> String {
        format!("USER#{}#ACTION#{}", self.user_id, self.action_id)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord)]
#[storable]
pub enum RequestLockKey {
    CreateAction {
        user_principal: Principal,
        link_id: String,
        action_type: String,
    },
    CreateLink {
        user_principal: Principal,
    },
    ProcessAction {
        user_principal: Principal,
        action_id: String,
    },
}

impl fmt::Display for RequestLockKey {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            RequestLockKey::CreateAction {
                user_principal,
                link_id,
                action_type,
            } => write!(
                f,
                "CREATE_ACTION#USER#{}#LINK#{}#ACTION_TYPE#{}",
                user_principal, link_id, action_type
            ),
            RequestLockKey::CreateLink { user_principal } => {
                write!(f, "CREATE_LINK#USER#{}", user_principal)
            }
            RequestLockKey::ProcessAction {
                user_principal,
                action_id,
            } => write!(
                f,
                "PROCESS_ACTION#USER#{}#ACTION#{}",
                user_principal, action_id
            ),
        }
    }
}
