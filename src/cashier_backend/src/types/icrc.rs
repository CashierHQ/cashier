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

use candid::CandidType;
use serde::Deserialize;

/**
 * ICRC21 Types
 */
#[derive(CandidType, Deserialize, Eq, PartialEq, Debug)]
pub struct Icrc21ConsentMessageMetadata {
    pub language: String,
    pub utc_offset_minutes: Option<i16>,
}

#[derive(CandidType, Deserialize)]
pub enum Icrc21DeviceSpec {
    GenericDisplay,
    LineDisplay {
        characters_per_line: u16,
        lines_per_page: u16,
    },
}

#[derive(CandidType, Deserialize)]
pub struct Icrc21ConsentMessageSpec {
    pub metadata: Icrc21ConsentMessageMetadata,
    pub device_spec: Option<Icrc21DeviceSpec>,
}

#[derive(CandidType, Deserialize)]
pub struct Icrc21ConsentMessageRequest {
    pub arg: serde_bytes::ByteBuf,
    pub method: String,
    pub user_preferences: Icrc21ConsentMessageSpec,
}

#[derive(CandidType, Deserialize, Eq, PartialEq, Debug)]
pub struct Icrc21LineDisplayPage {
    pub lines: Vec<String>,
}

#[derive(CandidType, Deserialize, Eq, PartialEq, Debug)]
pub enum Icrc21ConsentMessage {
    LineDisplayMessage { pages: Vec<Icrc21LineDisplayPage> },
    GenericDisplayMessage(String),
}

#[derive(CandidType, Deserialize, Eq, PartialEq, Debug)]
pub struct Icrc21ConsentInfo {
    pub metadata: Icrc21ConsentMessageMetadata,
    pub consent_message: Icrc21ConsentMessage,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct Icrc21ErrorInfo {
    pub description: String,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum Icrc21Error {
    GenericError {
        description: String,
        error_code: candid::Nat,
    },
    InsufficientPayment(Icrc21ErrorInfo),
    UnsupportedCanisterCall(Icrc21ErrorInfo),
    ConsentMessageUnavailable(Icrc21ErrorInfo),
}

#[derive(CandidType, Deserialize, Eq, PartialEq, Debug)]
pub struct Icrc21SupportedStandard {
    pub url: String,
    pub name: String,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct Icrc28TrustedOriginsResponse {
    pub trusted_origins: Vec<String>,
}
