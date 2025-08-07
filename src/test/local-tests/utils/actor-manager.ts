/* eslint-disable @typescript-eslint/no-explicit-any */
// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { HttpAgent, Identity, Actor } from "@dfinity/agent";
import { idlFactory } from "../../../../src/cashier_frontend/src/generated/cashier_backend/cashier_backend.did";

interface CreateActorOptions {
    agent?: HttpAgent;
    agentOptions?: Record<string, any>;
    actorOptions?: Record<string, any>;
}

export const createActor = (canisterId: string, options: CreateActorOptions = {}) => {
    const agent = options.agent || new HttpAgent({ ...options.agentOptions });

    if (options.agent && options.agentOptions) {
        console.warn(
            "Detected both agent and agentOptions passed to createActor. Ignoring agentOptions and proceeding with the provided agent.",
        );
    }

    // Fetch root key for certificate validation during development
    if (process.env["DFX_NETWORK"] !== "ic") {
        agent.fetchRootKey().catch((err: Error) => {
            console.warn(
                "Unable to fetch root key. Check to ensure that your local replica is running",
            );
            console.error(err);
        });
    }

    // Creates an actor with using the candid interface and the HttpAgent
    return Actor.createActor(idlFactory, {
        agent,
        canisterId,
        ...options.actorOptions,
    });
};

export class ActorManager {
    private identity?: Identity;

    private canisterId: string;

    constructor({ identity, canisterId }: { identity?: Identity; canisterId: string }) {
        this.identity = identity;
        this.canisterId = canisterId;
    }

    public withIdentity(identity: Identity) {
        this.identity = identity;
        return this;
    }

    public async getHttpAgent() {
        if (!this.identity) {
            throw new Error("Identity not found");
        }

        const agent = HttpAgent.createSync({
            identity: this.identity,
            host: "http://127.0.0.1:4943",
        });

        await agent.fetchRootKey().catch((err) => {
            console.warn(
                "Unable to fetch root key. Check to ensure that your local replica is running",
            );
            console.error(err);
        });

        return agent;
    }

    public async initBackendActor() {
        const agent = HttpAgent.createSync({
            identity: this.identity,
            host: "http://127.0.0.1:4943",
        });

        agent.fetchRootKey().catch((err) => {
            console.warn(
                "Unable to fetch root key. Check to ensure that your local replica is running",
            );
            console.error(err);
        });

        return createActor(this.canisterId, { agent });
    }
}
