// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

export type Icrc112RequestModel = {
    arg: string;
    method: string;
    canisterId: string;
    nonce?: string;
};
