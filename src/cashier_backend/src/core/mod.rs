use crate::types::link_detail::*;
use crate::types::user::*;

pub mod api_link;
pub mod api_user;
pub mod store;

ic_cdk::export_candid!();
