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

import { Agent } from "@dfinity/agent";

export interface RPCBase {
    origin: string;
    jsonrpc: string;
    id: string;
}
export interface RPCMessage extends RPCBase {
    method: string;
    params: unknown;
}

export interface RPCSuccessResponse extends RPCBase {
    result: unknown;
}

export interface RPCErrorResponse extends RPCBase {
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
