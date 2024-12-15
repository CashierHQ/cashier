/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import {
    Agent,
    bufFromBufLike,
    CallRequest,
    Cbor,
    Certificate,
    HttpAgent,
    Identity,
    v3ResponseBody,
    blsVerify,
    lookupResultToBuffer,
    UpdateCallRejectedError,
    defaultStrategy,
    pollForResponse,
    v2ResponseBody,
} from "@dfinity/agent";
import { AgentError } from "@dfinity/agent/lib/cjs/errors";
import { DelegationIdentity, Ed25519KeyIdentity } from "@dfinity/identity";
import { Principal } from "@dfinity/principal";
import { fromBase64 } from "@nfid/identitykit";
import { useIdentity, useSigner } from "@nfid/identitykit/react";
import { Buffer } from "buffer";
export interface CallCanisterRequest {
    delegation: DelegationIdentity;
    canisterId: string;
    calledMethodName: string;
    parameters: string;
    agent: Agent;
}

export interface CallCanisterResponse {
    contentMap: string;
    certificate: string;
}

export interface CallCanisterRequest {
    delegation: DelegationIdentity;
    canisterId: string;
    calledMethodName: string;
    parameters: string;
    agent: Agent;
}

export interface CallCanisterResponse {
    contentMap: string;
    certificate: string;
}

class CallCanisterService {
    public async call(request: CallCanisterRequest): Promise<CallCanisterResponse> {
        try {
            const response = await this.poll(
                request.canisterId,
                request.calledMethodName,
                request.agent,
                fromBase64(request.parameters),
            );
            const certificate: string = Buffer.from(response.certificate).toString("base64");
            const cborContentMap = Cbor.encode(response.contentMap);
            const contentMap: string = Buffer.from(cborContentMap).toString("base64");

            return {
                certificate,
                contentMap,
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
    ): Promise<{ certificate: Uint8Array; contentMap: CallRequest | undefined }> {
        const cid = Principal.from(canisterId);

        if (agent.rootKey == null)
            throw new AgentError("Agent root key not initialized before making call");

        const { requestId, response, requestDetails } = await agent.call(cid, {
            methodName,
            arg,
            effectiveCanisterId: cid,
        });

        let certificate: Certificate | undefined;

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
                lookupResultToBuffer(certificate.lookup([...(path as unknown as any), "status"])),
            );

            switch (status) {
                case "replied":
                    break;
                case "rejected": {
                    // Find rejection details in the certificate
                    const rejectCode = new Uint8Array(
                        lookupResultToBuffer(
                            certificate.lookup([...(path as unknown as any), "reject_code"]),
                        )!,
                    )[0];
                    const rejectMessage = new TextDecoder().decode(
                        lookupResultToBuffer(
                            certificate.lookup([...(path as unknown as any), "reject_message"]),
                        )!,
                    );
                    const error_code_buf = lookupResultToBuffer(
                        certificate.lookup([...(path as unknown as any), "error_code"]),
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
        }

        return {
            contentMap: requestDetails,
            certificate: new Uint8Array(Cbor.encode((certificate as any).cert)),
        };
    }
}

export const TestPage = () => {
    const signer = useSigner();
    const idenity = useIdentity();

    const checkSigner = async () => {
        console.log("🚀 ~ checkSigner ~ signer", signer);
    };

    const callCanister = async () => {
        if (!signer) {
            console.error("Signer is not found");
            return;
        }

        if (!idenity) {
            console.error("Identity is not found");
            return;
        }

        const sessionKey = Ed25519KeyIdentity.generate();
        if (!sessionKey) {
            console.error("Session key is not found");
            return;
        }

        const delegationChain = await signer.delegation({
            publicKey: idenity?.getPrincipal().toUint8Array() as unknown as ArrayBuffer,
        });
        // const delegationChain = await signer.delegation({
        //     publicKey: sessionKey.getPublicKey().rawKey,
        // });
        if (!delegationChain) {
            console.error("Delegation chain is not found");
            return;
        }

        const delegation = DelegationIdentity.fromDelegation(sessionKey, delegationChain);

        const agent: Agent = HttpAgent.createSync({
            host: "https://ic0.app",
            identity: delegation as unknown as Identity,
        });

        const service = new CallCanisterService();

        const callResponse = await service.call({
            canisterId: "etik7-oiaaa-aaaar-qagia-cai",
            calledMethodName: "icrc2_approve",
            parameters:
                "RElETAZufW17bgFueGwCs7DawwNorYbKgwUCbAjG/LYCALqJ5cIEAqLelOsGAoLz85EMA9ijjKgNfZGcnL8NAN6n99oNA8uW3LQOBAEFAAAAAICAgMnVm5n4jJ4EAAABHddbvOJ4U2u2S79mR0+xkJBPtwHztu02la8/gFECAA==",
            delegation: delegation,
            agent,
        });

        console.log("🚀 ~ callCanister ~ callResponse", callResponse);
    };

    return (
        <>
            <Button onClick={checkSigner}>Check Signer</Button>

            <Button onClick={callCanister}>Call Canister</Button>
        </>
    );
};
