// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { AuthClient, type AuthClientLoginOptions } from "@dfinity/auth-client";
import { type Channel, type Connection, type Transport } from "@slide-computer/signer";
import { ClientChannel } from "./channel";
import { ClientConnection } from "./connection";
import { HttpAgent } from "@dfinity/agent";

export class AuthClientTransportError extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, AuthClientTransportError.prototype);
    }
}

type AuthClientCreateOptions = Parameters<typeof AuthClient.create>[0];

export interface AuthClientTransportOptions {
    /**
     * Options used to create AuthClient instance
     */
    authClientCreateOptions?: AuthClientCreateOptions;
    /**
     * Options used to log in with AuthClient instance
     */
    authClientLoginOptions?: AuthClientLoginOptions;
    /**
     * Auth Client disconnect monitoring interval in ms
     * @default 3000
     */
    authClientDisconnectMonitoringInterval?: number;
    /**
     * Optional, used to make canister calls
     * @default uses {@link HttpAgent} by default
     */
    agent?: HttpAgent;
}

export class ClientTransport implements Transport {
    static #isInternalConstructing: boolean = false;

    readonly #connection: Connection;
    readonly #authClient: AuthClient;
    readonly #agent?: HttpAgent;

    private constructor(authClient: AuthClient, connection: Connection, agent?: HttpAgent) {
        const throwError = !ClientTransport.#isInternalConstructing;
        ClientTransport.#isInternalConstructing = false;
        if (throwError) {
            throw new AuthClientTransportError("ClientTransport is not constructable");
        }
        this.#authClient = authClient;
        this.#connection = connection;
        this.#agent = agent;
    }

    get connection(): Connection {
        return this.#connection;
    }

    static async create(options: AuthClientTransportOptions): Promise<ClientTransport> {
        const authClient = await AuthClient.create(options.authClientCreateOptions);
        const connection = new ClientConnection({
            authClient,
            authClientLoginOptions: options.authClientLoginOptions,
            authClientDisconnectMonitoringInterval: options.authClientDisconnectMonitoringInterval,
        });

        ClientTransport.#isInternalConstructing = true;
        return new ClientTransport(authClient, connection, options.agent);
    }

    async establishChannel(): Promise<Channel> {
        if (!this.#connection.connected) {
            throw new AuthClientTransportError("ClientTransport is not connected");
        }
        return new ClientChannel({
            authClient: this.#authClient,
            connection: this.#connection,
            agent: this.#agent,
        });
    }
}
