// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

pub type UserKey = String;

pub type UserWalletKey = String;

pub type LinkKey = String;

pub type ActionKey = String;

pub type ActionTypeKey = String;

pub type IntentKey = String;

pub type TransactionKey = String;

pub struct UserLinkKey {
    pub user_id: UserKey,
    pub link_id: LinkKey,
}

impl UserLinkKey {
    pub fn to_str(&self) -> String {
        format!("USER#{}#LINK#{}", self.user_id, self.link_id)
    }
}

pub struct UserActionKey {
    pub user_id: String,
    pub action_id: String,
}

impl UserActionKey {
    pub fn to_str(&self) -> String {
        format!("USER#{}#ACTION#{}", self.user_id, self.action_id)
    }
}

#[derive(Debug, Clone)]
pub struct LinkActionKey {
    pub link_id: String,
    pub action_type: String,
    pub action_id: String,
    // if it is anonymous user, user_id = ANON#<anonymous_wallet_address>
    pub user_id: String,
}

impl LinkActionKey {
    pub fn to_str(&self) -> String {
        format!(
            "LINK#{}#USER#{}#TYPE#{}#ACTION#{}",
            self.link_id, self.user_id, self.action_type, self.action_id
        )
    }
}

#[derive(Debug, Clone)]
pub struct ActionIntentKey {
    pub action_id: String,
    pub intent_id: String,
}

impl ActionIntentKey {
    pub fn to_str(&self) -> String {
        format!("ACTION#{}#INTENT#{}", self.action_id, self.intent_id)
    }

    pub fn to_str_reverse(&self) -> String {
        format!("INTENT#{}#ACTION#{}", self.intent_id, self.action_id)
    }
}

pub struct IntentTransactionKey {
    pub intent_id: String,
    pub transaction_id: String,
}

impl IntentTransactionKey {
    pub fn to_str(&self) -> String {
        format!(
            "INTENT#{}#TRANSACTION#{}",
            self.intent_id, self.transaction_id
        )
    }

    pub fn to_str_reverse(&self) -> String {
        format!(
            "TRANSACTION#{}#INTENT#{}",
            self.transaction_id, self.intent_id
        )
    }
}
