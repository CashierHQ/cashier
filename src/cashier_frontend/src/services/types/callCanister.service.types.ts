// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { Agent } from "@dfinity/agent";

interface RPCBase {
    origin: string;
    jsonrpc: string;
    id: string;
}
interface RPCMessage extends RPCBase {
    method: string;
    params: unknown;
}

interface RPCSuccessResponse extends RPCBase {
    result: unknown;
}

interface RPCErrorResponse extends RPCBase {
    error: {
        code: number;
        message: string;
        data?: unknown;
    };
}

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

export interface CallCanisterRequest {
    canisterId: string;
    calledMethodName: string;
    parameters: string;
    agent: Agent;
}

export interface CallCanisterResponse {
    contentMap: string;
    certificate: string;
}
