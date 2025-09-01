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
    /// User + Link + Action composite key
    UserLinkAction {
        user_principal: Principal,
        link_id: String,
        action_id: String,
    },
    /// User + Link composite key
    UserLink {
        user_principal: Principal,
        link_id: String,
    },
    /// User + Action + Transaction composite key
    UserActionTransaction {
        user_principal: Principal,
        action_id: String,
        transaction_id: String,
    },
}

impl fmt::Display for RequestLockKey {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            RequestLockKey::UserLinkAction {
                user_principal,
                link_id,
                action_id,
            } => {
                write!(f, "USER#{user_principal}#LINK#{link_id}#ACTION#{action_id}")
            }
            RequestLockKey::UserLink {
                user_principal,
                link_id,
            } => {
                write!(f, "USER#{user_principal}#LINK#{link_id}")
            }
            RequestLockKey::UserActionTransaction {
                user_principal,
                action_id,
                transaction_id,
            } => {
                write!(
                    f,
                    "USER#{user_principal}#ACTION#{action_id}#TRANSACTION#{transaction_id}"
                )
            }
        }
    }
}

impl RequestLockKey {
    /// Create a User + Link + Action key
    pub fn user_link_action(
        user_principal: Principal,
        link_id: impl Into<String>,
        action_id: impl Into<String>,
    ) -> Self {
        Self::UserLinkAction {
            user_principal,
            link_id: link_id.into(),
            action_id: action_id.into(),
        }
    }

    /// Create a User + Link key
    pub fn user_link(user_principal: Principal, link_id: impl Into<String>) -> Self {
        Self::UserLink {
            user_principal,
            link_id: link_id.into(),
        }
    }

    /// Create a User + Action + Transaction key
    pub fn user_action_transaction(
        user_principal: Principal,
        action_id: impl Into<String>,
        transaction_id: impl Into<String>,
    ) -> Self {
        Self::UserActionTransaction {
            user_principal,
            action_id: action_id.into(),
            transaction_id: transaction_id.into(),
        }
    }
}
