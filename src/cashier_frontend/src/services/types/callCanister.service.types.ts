// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { Agent } from "@dfinity/agent";

export interface CallCanisterRequest {
    canisterId: string;
    calledMethodName: string;
    parameters: string;
    agent: Agent;
}

export interface CallCanisterResponse {
    contentMap: string;
    certificate: string;
    reply?: ArrayBuffer;
}


