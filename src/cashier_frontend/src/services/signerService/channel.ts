import type { AuthClient } from "@dfinity/auth-client";
import {
    type Channel,
    type Connection,
    type DelegationRequest,
    fromBase64,
    INVALID_REQUEST_ERROR,
    isJsonRpcRequest,
    type JsonRequest,
    type JsonResponse,
    NOT_SUPPORTED_ERROR,
    toBase64,
} from "@slide-computer/signer";
import { AuthClientTransportError } from "./transport";
import { scopes, supportedStandards } from "./constants";
import { DelegationChain, DelegationIdentity } from "@dfinity/identity";
import { HttpAgent } from "@dfinity/agent";
import { callCanisterService } from "./callCanister.service";
import { Icrc112Response, ICRC112Service, JsonICRC112Request } from "./icrc112.service";
import { IcrcMethod } from "@/types/icrc-method";

export interface ClientChannelOptions {
    /**
     * AuthClient instance from "@dfinity/auth-client"
     */
    authClient: AuthClient;
    /**
     * ClientTransport connection, used to close channel once connection is closed
     */
    connection: Connection;

    /**
     * Optional, used to make canister calls
     * @default uses {@link HttpAgent} by default
     */
    agent?: HttpAgent;
}

export class ClientChannel implements Channel {
    #options: Required<ClientChannelOptions>;
    #closed: boolean = false;
    #closeListeners = new Set<() => void>();
    #responseListeners = new Set<(response: JsonResponse) => void>();

    constructor(options: ClientChannelOptions) {
        this.#options = {
            ...options,
            agent: options.agent ?? HttpAgent.createSync(),
        };
        this.#options.connection.addEventListener("disconnect", () => (this.#closed = true));
    }

    get closed() {
        return this.#closed || !this.#options.connection.connected;
    }

    addEventListener(
        ...[event, listener]:
            | [event: "close", listener: () => void]
            | [event: "response", listener: (response: JsonResponse) => void]
    ): () => void {
        switch (event) {
            case "close":
                this.#closeListeners.add(listener);
                return () => {
                    this.#closeListeners.delete(listener);
                };
            case "response":
                this.#responseListeners.add(listener);
                return () => {
                    this.#responseListeners.delete(listener);
                };
        }
    }

    async send(request: JsonRequest): Promise<void> {
        if (this.closed) {
            throw new AuthClientTransportError("Communication channel is closed");
        }

        // Ignore one way messages
        const id = request.id;
        if (id === undefined) {
            return;
        }

        // Create response and call listeners
        const response = await this.createResponse({ id, ...request });

        this.#responseListeners.forEach((listener) => listener(response));
    }

    async close(): Promise<void> {
        this.#closed = true;
        this.#closeListeners.forEach((listener) => listener());
    }

    async createResponse(
        request: JsonRequest & { id: NonNullable<JsonRequest["id"]> },
    ): Promise<JsonResponse> {
        const id = request.id;

        if (!isJsonRpcRequest(request)) {
            return this.createInvalidRequestErrorResponse(id);
        }

        switch (request.method) {
            case IcrcMethod.SupportedStandards:
                return this.createSupportedStandardsResponse(id);
            case IcrcMethod.Permissions:
            case IcrcMethod.RequestPermissions:
                return this.createPermissionsResponse(id);
            case IcrcMethod.Delegation:
                return this.createDelegationResponse(id, request);
            case IcrcMethod.BatchCallCanisters:
                return this.createBatchCallCanistersResponse(id, request);
            default:
                return this.createNotSupportedErrorResponse(id);
        }
    }

    private createInvalidRequestErrorResponse(id: string | number): JsonResponse {
        return {
            id,
            jsonrpc: "2.0",
            error: { code: INVALID_REQUEST_ERROR, message: "Invalid request" },
        };
    }

    private createSupportedStandardsResponse(id: string | number): JsonResponse {
        return {
            id,
            jsonrpc: "2.0",
            result: { supportedStandards },
        };
    }

    private createPermissionsResponse(id: string | number): JsonResponse {
        return {
            id,
            jsonrpc: "2.0",
            result: { scopes },
        };
    }

    private async createDelegationResponse(
        id: string | number,
        request: JsonRequest,
    ): Promise<JsonResponse> {
        // As per the ICRC-34 spec, II only returns unscoped Relying Party delegations (without targets).
        const delegationRequest = request as DelegationRequest;

        if (!delegationRequest.params) {
            throw new AuthClientTransportError("Required params missing in request");
        }

        const identity = this.#options.authClient.getIdentity() as DelegationIdentity;
        const publicKey = fromBase64(delegationRequest.params.publicKey);
        const expiration = this.getExpiration(delegationRequest.params.maxTimeToLive);

        const delegation = await this.getDelegation(identity, publicKey, expiration);

        return {
            id,
            jsonrpc: "2.0",
            result: {
                publicKey: toBase64(delegation.publicKey),
                signerDelegation: this.getSignerDelegation(delegation),
            },
        };
    }

    private async createBatchCallCanistersResponse(
        id: string | number,
        request: JsonRequest,
    ): Promise<JsonResponse> {
        const icrc112Request = request as JsonICRC112Request;
        const icrc112Service = new ICRC112Service({
            agent: this.#options.agent,
            callCanisterService: callCanisterService,
        });

        let responseIcrc112: Icrc112Response = { responses: [] };

        if (icrc112Request.params?.requests) {
            responseIcrc112 = await icrc112Service.icrc112Execute(icrc112Request.params.requests);
        }

        return {
            id,
            jsonrpc: "2.0",
            result: JSON.parse(JSON.stringify(responseIcrc112)),
        };
    }

    private createNotSupportedErrorResponse(id: string | number): JsonResponse {
        return {
            id,
            jsonrpc: "2.0",
            error: { code: NOT_SUPPORTED_ERROR, message: "Not supported" },
        };
    }

    private getExpiration(maxTimeToLive: string | undefined): Date | undefined {
        if (!maxTimeToLive) return undefined;

        return new Date(Date.now() + Number(BigInt(maxTimeToLive) / BigInt(1_000_000)));
    }

    private async getDelegation(
        identity: DelegationIdentity,
        publicKey: ArrayBuffer,
        expiration: Date | undefined,
    ): Promise<DelegationChain> {
        return await DelegationChain.create(identity, { toDer: () => publicKey }, expiration, {
            previous: identity.getDelegation(),
        });
    }

    private getSignerDelegation(delegation: DelegationChain) {
        return delegation.delegations.map(({ delegation, signature }) => ({
            delegation: {
                pubkey: toBase64(delegation.pubkey),
                expiration: delegation.expiration.toString(),
                ...(delegation.targets
                    ? {
                          targets: delegation.targets.map((target) => target.toText()),
                      }
                    : {}),
            },
            signature: toBase64(signature),
        }));
    }
}
