// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { parse as uuidParse } from "uuid";
export const linkIdToSubaccount = (id: string) => {
    const uuidBytes = uuidParse(id);
    // DO NOT CHANGE THE ORDER OF THE BYTES
    const subaccount = new Uint8Array(32);
    subaccount.set(uuidBytes, 0);
    return subaccount;
};
