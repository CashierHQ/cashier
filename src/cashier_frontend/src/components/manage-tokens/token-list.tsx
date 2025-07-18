// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { ManageTokensTokenItem } from "./token-card";
import { FungibleToken } from "@/types/fungible-token.speculative";

interface ManageTokensListProps {
    items: FungibleToken[];
}

export function ManageTokensList({ items }: ManageTokensListProps) {
    return (
        <ul className="flex flex-col gap-5">
            {items.map((token, index) => (
                <li key={index}>
                    <ManageTokensTokenItem token={token} />
                </li>
            ))}
        </ul>
    );
}
