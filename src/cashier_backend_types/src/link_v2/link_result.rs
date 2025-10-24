use crate::{
    link_v2::action_result::{CreateActionResult, ProcessActionResult},
    repository::link::v1::Link,
};

#[derive(Debug, Clone)]
pub struct LinkCreateActionResult {
    pub link: Link,
    pub create_action_result: CreateActionResult,
}

#[derive(Debug, Clone)]
pub struct LinkProcessActionResult {
    pub link: Link,
    pub process_action_result: ProcessActionResult,
}
