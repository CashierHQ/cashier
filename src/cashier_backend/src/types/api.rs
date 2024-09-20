use candid::CandidType;
use serde::Deserialize;

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct PaginateInput {
    pub offset: usize,
    pub limit: usize,
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
