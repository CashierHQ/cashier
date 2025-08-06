// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { FungibleToken } from "@/types/fungible-token.speculative";

export type AssetSelectItem = Pick<FungibleToken, "id" | "name" | "address" | "amount" | "logo">;
