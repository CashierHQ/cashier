// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

#![allow(clippy::missing_errors_doc)]
#![deny(clippy::panic)]
#![deny(clippy::unwrap_used)]
#![deny(clippy::expect_used)]
#![warn(clippy::indexing_slicing)]
#![warn(clippy::integer_arithmetic)]
// Clone-related lints
#![warn(clippy::clone_on_ref_ptr)]
#![warn(clippy::clone_on_copy)]
#![warn(clippy::redundant_clone)]
#![warn(clippy::unnecessary_clone)]
// Performance and best practices
#![warn(clippy::inefficient_to_string)]
#![warn(clippy::large_types_passed_by_value)]
#![warn(clippy::needless_pass_by_value)]
#![warn(clippy::redundant_closure)]
#![warn(clippy::redundant_closure_for_method_calls)]
#![warn(clippy::map_clone)]
#![warn(clippy::cloned_instead_of_copied)]
// Memory and allocation
#![warn(clippy::box_collection)]
#![warn(clippy::redundant_allocation)]
#![warn(clippy::rc_buffer)]
// Style and correctness
#![warn(clippy::explicit_iter_loop)]
#![warn(clippy::manual_map)]
#![warn(clippy::map_unwrap_or)]
#![warn(clippy::needless_collect)]
#![warn(clippy::single_char_pattern)]
#![warn(clippy::string_add)]
#![warn(clippy::string_add_assign)]
#![warn(clippy::needless_return)]
#![warn(clippy::all, clippy::pedantic)]
#![allow(clippy::module_name_repetitions)]
#![allow(missing_docs)]
#![allow(clippy::cargo_common_metadata)]
#![allow(clippy::multiple_crate_versions)]
#![deny(clippy::large_types_passed_by_value)]
#![warn(clippy::map_unwrap_or)]
#![warn(clippy::redundant_closure_for_method_calls)]

pub mod action;
pub mod adapter;
pub mod ext;
pub mod link;
pub mod request_lock;
pub mod transaction;
pub mod transaction_manager;
pub mod user;

// #[cfg(test)]
// pub mod __tests__;
