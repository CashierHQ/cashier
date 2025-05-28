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

use proc_macro::TokenStream;
use syn::Error;

pub fn handle_macro_errors<F>(
    cb: F,
    _name: &str,
    metadata: TokenStream,
    item: TokenStream,
) -> TokenStream
where
    F: FnOnce(TokenStream, TokenStream) -> Result<TokenStream, Error>,
{
    let result = cb(metadata, item);

    result.map_or_else(|e| e.to_compile_error().into(), Into::into)
}
