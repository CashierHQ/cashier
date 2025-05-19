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

use cashier_types::{Action, ActionState, ActionType, Intent, LinkUserState};

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
