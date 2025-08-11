// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

//! # IC Canister Macros Library
//!
//! Common macros for IC canisters to expose reusable features.
//!
//! Some of the features include:
//!
//! - Entity generation for stable structures.
//! - Middleware injection for functions.

extern crate proc_macro;

mod macros;
mod utils;

use crate::macros::MacroDefinition;
use proc_macro::TokenStream;

/// The `storable` procedural macro is designed to generate serialization and deserialization
/// implementations for a given struct or enum. It allows for the serialization format to be
/// specified, as well as, optionally the maximum byte size that the object can be serialized to.
///
/// This macro is compatible with the `ic_stable_strcutures` crate and it can be used to generate
/// objects that can be stored in the stable memory of a canister.
///
/// # Parameters
///
/// - `size`: The maximum byte size that the object can be serialized to.
/// - `format`: The serialization format to be used. Supported formats are `cbor` and `candid`.
///
/// # Usage
///
/// Annotate a struct or enum with `#[storable]`.
///
/// # Examples
///
/// Basic usage with default parameters:
///
/// ```ignore
/// #[storable]
/// struct MyStruct {
///     field1: u32,
///     field2: String,
/// }
/// ```
///
/// Usage with custom parameters:
///
/// ```ignore
/// #[storable(size = 1000, format = "cbor")]
/// struct MyStruct {
///     field1: u32,
///     field2: String,
/// }
/// ```
///
/// # Notes
///
/// - The macro currently supports only struct and enum items.
///
/// # Notes on Serialization Formats
///
/// ## Candid
///
/// - Only accepts schema evolution without breaking changes in struct fields if the new field is `optional`.
///
/// ## CBOR
///
/// - Accepts schema evolution with field addition in structs, but only if serde's `default` attribute is used.
#[proc_macro_attribute]
pub fn storable(input_args: TokenStream, input: TokenStream) -> TokenStream {
    utils::handle_macro_errors(
        |input_args, input| {
            let macro_impl = macros::storable::StorableMacro::new(input_args, input);

            macro_impl.build()
        },
        macros::storable::StorableMacro::MACRO_NAME,
        input_args,
        input,
    )
}
