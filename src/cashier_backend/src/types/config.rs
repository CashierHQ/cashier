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

use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IntentTemplate {
    pub task: String,
    pub intent_type: String,
    pub chain: String,
    pub dependency: Vec<String>,
    pub intent_data: Value,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IntentConfig {
    pub intents: HashMap<String, Vec<IntentTemplate>>, // Mapping link_type_action_type → intents
}
