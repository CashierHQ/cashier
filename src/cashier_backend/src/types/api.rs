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
