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

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    Agent,
    Cbor,
    Certificate,
    lookupResultToBuffer,
    pollForResponse,
    blsVerify,
    defaultStrategy,
    CallRequest,
    v3ResponseBody,
    UpdateCallRejectedError,
    v2ResponseBody,
} from "@dfinity/agent";
import { AgentError } from "@dfinity/agent/lib/cjs/errors";
import { bufFromBufLike } from "@dfinity/candid";
import { Principal } from "@dfinity/principal";
import { fromBase64, toBase64 } from "@slide-computer/signer";
export interface CallCanisterRequest {
    canisterId: string;
    calledMethodName: string;
    parameters: string;
    agent: Agent;
}

export interface CallCanisterResponse {
    contentMap: string;
    certificate: string;
    reply?: string;
}

export interface CallCanisterRequest {
    canisterId: string;
    calledMethodName: string;
    parameters: string;
    agent: Agent;
}

export class CallCanisterService {
    public async call(request: CallCanisterRequest): Promise<CallCanisterResponse> {
        try {
            const response = await this.poll(
                request.canisterId,
                request.calledMethodName,
                request.agent,
                fromBase64(request.parameters),
            );
            const certificate: string = toBase64(response.certificate);
            const cborContentMap = Cbor.encode(response.contentMap);
            const contentMap: string = toBase64(cborContentMap);
            const reply = response.reply ? toBase64(response.reply) : undefined;

            return {
                certificate,
                contentMap,
                reply,
            };
        } catch (error) {
            console.error("The canister call cannot be executed:", error);

            if (error instanceof Error) {
                throw new Error(error.message);
            }

            throw new Error("The canister call cannot be executed");
        }
    }

    private async poll(
        canisterId: string,
        methodName: string,
        agent: Agent,
        arg: ArrayBuffer,
    ): Promise<{
        certificate: Uint8Array;
        contentMap: CallRequest | undefined;
        reply: ArrayBuffer | undefined;
    }> {
        const cid = Principal.from(canisterId);

        if (agent.rootKey == null)
            throw new AgentError("Agent root key not initialized before making call");

        const { requestId, response, requestDetails } = await agent.call(cid, {
            methodName,
            arg,
            effectiveCanisterId: cid,
        });

        let certificate: Certificate | undefined;
        let reply: ArrayBuffer | undefined;

        if (response.body && (response.body as v3ResponseBody).certificate) {
            const cert = (response.body as v3ResponseBody).certificate;
            certificate = await Certificate.create({
                certificate: bufFromBufLike(cert),
                rootKey: agent.rootKey,
                canisterId: Principal.from(canisterId),
                blsVerify,
            });
            const path = [new TextEncoder().encode("request_status"), requestId];
            const status = new TextDecoder().decode(
                lookupResultToBuffer(certificate.lookup([...path, "status"])),
            );

            reply = lookupResultToBuffer(certificate.lookup([...path, "reply"]));

            console.log("status", status);
            console.log("reply", reply);

            switch (status) {
                case "replied":
                    break;
                case "rejected": {
                    // Find rejection details in the certificate
                    const rejectCode = new Uint8Array(
                        lookupResultToBuffer(certificate.lookup([...path, "reject_code"]))!,
                    )[0];
                    const rejectMessage = new TextDecoder().decode(
                        lookupResultToBuffer(certificate.lookup([...path, "reject_message"]))!,
                    );
                    const error_code_buf = lookupResultToBuffer(
                        certificate.lookup([...path, "error_code"]),
                    );
                    const error_code = error_code_buf
                        ? new TextDecoder().decode(error_code_buf)
                        : undefined;
                    throw new UpdateCallRejectedError(
                        cid,
                        methodName,
                        requestId,
                        response,
                        rejectCode,
                        rejectMessage,
                        error_code,
                    );
                }
            }
        } else if (response.body && "reject_message" in response.body) {
            // handle v2 response errors by throwing an UpdateCallRejectedError object
            const { reject_code, reject_message, error_code } = response.body as v2ResponseBody;
            throw new UpdateCallRejectedError(
                cid,
                methodName,
                requestId,
                response,
                reject_code,
                reject_message,
                error_code,
            );
        }

        // Fall back to polling if we receive an Accepted response code
        if (response.status === 202) {
            const pollStrategy = defaultStrategy();
            // Contains the certificate and the reply from the boundary node
            const response = await pollForResponse(agent, cid, requestId, pollStrategy, blsVerify);
            certificate = response.certificate;
            reply = response.reply;
        }

        return {
            contentMap: requestDetails,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            certificate: new Uint8Array(Cbor.encode((certificate as any).cert)),
            reply,
        };
    }

    public async getReply() {}
}

export const callCanisterService = new CallCanisterService();
