// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

#![allow(clippy::missing_errors_doc)]
#![deny(clippy::panic)]
#![deny(clippy::unwrap_used)]
#![deny(clippy::expect_used)]
#![warn(clippy::indexing_slicing)]
// Clone-related lints
#![warn(clippy::clone_on_ref_ptr)]
#![warn(clippy::clone_on_copy)]
#![warn(clippy::redundant_clone)]
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

mod build_data;
pub mod constant;
pub mod core;
pub mod domains;
pub mod migration;
pub mod repositories;
pub mod services;
pub mod utils;
