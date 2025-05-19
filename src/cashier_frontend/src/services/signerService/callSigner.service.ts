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

import { HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { Icrc112Requests, Icrc112Response } from "./icrc112.service";
import { Signer } from "./signer";
import { ClientTransport } from "./transport";
import { JsonRequest, JsonResponse } from "@slide-computer/signer";
import type { JsonObject } from "@dfinity/candid";
import { IC_HOST } from "@/const";

class CallSignerService {
    private agent: HttpAgent;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        this.agent = HttpAgent.createSync({ identity, host: IC_HOST });
    }

    async execute(input: Icrc112Requests): Promise<Icrc112Response> {
        const transport = await ClientTransport.create({
            agent: this.agent,
        });
        const signer = new Signer({ transport });

        const request: JsonRequest = {
            id: "1",
            jsonrpc: "2.0",
            method: "icrc112_batch_call_canister",
            params: {
                sender: (await this.agent.getPrincipal()).toString(),
                requests: input as unknown as JsonObject,
            },
        };
        const response = await signer.sendRequest(request);
        console.log("🚀 ~ CallSignerService ~ executeIcrc112 ~ response:", response);
        return this.parseResponse<Icrc112Response>(response);
    }

    private parseResponse<T>(jsonObj: JsonResponse): T {
        if ("result" in jsonObj) {
            return jsonObj.result as unknown as T;
        } else {
            throw new Error(`Error in response: ${JSON.stringify(jsonObj.error)}`);
        }
    }
}

export default CallSignerService;
