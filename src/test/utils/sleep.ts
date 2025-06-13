// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { setTimeout } from "node:timers/promises";

export function sleep(ms: number) {
    return setTimeout(ms);
}
