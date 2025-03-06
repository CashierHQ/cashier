/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    Agent,
    blsVerify,
    Cbor,
    Certificate,
    defaultStrategy,
    lookupResultToBuffer,
    pollForResponse,
    RequestId,
    SubmitResponse,
    UpdateCallRejectedError,
    v2ResponseBody,
    v3ResponseBody,
} from "@dfinity/agent";
import { AgentError } from "@dfinity/agent/lib/cjs/errors";
import { Principal } from "@dfinity/principal";
import { fromBase64, toBase64 } from "@nfid/identitykit";
import {
    CallCanisterPollResponse,
    CallCanisterRequest,
    CallCanisterResponse,
} from "../types/callCanister.service.types";
import { bufFromBufLike } from "@dfinity/candid";

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
            const contentMap: string = toBase64(Cbor.encode(response.contentMap));
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
    ): Promise<CallCanisterPollResponse> {
        const cid = Principal.from(canisterId);

        if (agent.rootKey === null) {
            throw new AgentError("Agent root key not initialized before making call");
        }

        const submitResponse = await agent.call(cid, {
            methodName,
            arg,
            effectiveCanisterId: cid,
        });

        const { requestId, response, requestDetails } = submitResponse;

        let certificate: Certificate | undefined;
        let reply: ArrayBuffer | undefined;

        if (isV3ResponseBody(response.body)) {
            const handleResponse = await this.handleV3Response(
                submitResponse,
                agent,
                canisterId,
                cid,
                methodName,
            );

            certificate = handleResponse.certificate;
            reply = handleResponse.reply;
        }

        if (isV2ResponseBody(response.body)) {
            this.handleV2Response(submitResponse, cid, methodName);
        }

        // Fall back to polling if we receive an Accepted response code
        if (isStatusAccepted(response.status)) {
            // Contains the certificate and the reply from the boundary node
            const pollResponse = await pollForResponse(
                agent,
                cid,
                requestId,
                defaultStrategy(),
                blsVerify,
            );

            certificate = pollResponse.certificate;
            reply = pollResponse.reply;
        }

        return {
            contentMap: requestDetails,
            certificate: new Uint8Array(Cbor.encode((certificate as any).cert)),
            reply,
        };
    }

    private async handleV3Response(
        submitResponse: SubmitResponse,
        agent: Agent,
        canisterId: string,
        cid: Principal,
        methodName: string,
    ) {
        const { requestId, response } = submitResponse;
        const cert = (response.body as v3ResponseBody).certificate;

        const certificate = await Certificate.create({
            certificate: bufFromBufLike(cert),
            rootKey: agent.rootKey!,
            canisterId: Principal.from(canisterId),
            blsVerify,
        });

        const path = [new TextEncoder().encode("request_status"), requestId];

        const status = new TextDecoder().decode(
            lookupResultToBuffer(certificate.lookup([...path, "status"])),
        );

        const reply = lookupResultToBuffer(certificate.lookup([...path, "reply"]));

        switch (status) {
            case "replied":
                break;
            case "rejected":
                this.handleV3ResponseRejected(submitResponse, certificate, path, cid, methodName);
                break;
        }

        return {
            certificate,
            reply,
        };
    }

    private handleV3ResponseRejected(
        { requestId, response }: SubmitResponse,
        certificate: Certificate,
        path: (Uint8Array<ArrayBufferLike> | RequestId)[],
        cid: Principal,
        methodName: string,
    ) {
        // Find rejection details in the certificate
        const rejectCode = new Uint8Array(
            lookupResultToBuffer(certificate.lookup([...path, "reject_code"]))!,
        )[0];

        const rejectMessage = new TextDecoder().decode(
            lookupResultToBuffer(certificate.lookup([...path, "reject_message"]))!,
        );

        const error_code_buf = lookupResultToBuffer(certificate.lookup([...path, "error_code"]));

        const error_code = error_code_buf ? new TextDecoder().decode(error_code_buf) : undefined;

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

    private handleV2Response(
        { requestId, response }: SubmitResponse,
        cid: Principal,
        methodName: string,
    ) {
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

    public async getReply() {}
}

function isV3ResponseBody(body: v2ResponseBody | v3ResponseBody | null): boolean {
    return !!(body && (body as v3ResponseBody).certificate);
}

function isV2ResponseBody(body: v2ResponseBody | v3ResponseBody | null): boolean {
    return !!(body && "reject_message" in body);
}

function isStatusAccepted(status: number) {
    return status === 202;
}

export const callCanisterService = new CallCanisterService();
