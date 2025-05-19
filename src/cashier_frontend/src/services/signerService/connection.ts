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

import type { Connection } from "@slide-computer/signer";
import { AuthClientTransportError } from "./transport";
import { DelegationIdentity, isDelegationValid } from "@dfinity/identity";
import type { AuthClient, AuthClientLoginOptions } from "@dfinity/auth-client";

interface ClientConnectionOptions {
    /**
     * AuthClient instance from "@dfinity/auth-client"
     */
    authClient: AuthClient;
    /**
     * Login options used to log in with AuthClient instance
     */
    authClientLoginOptions?: AuthClientLoginOptions;
    /**
     * Auth Client disconnect monitoring interval in ms
     * @default 3000
     */
    authClientDisconnectMonitoringInterval?: number;
}

export class ClientConnection implements Connection {
    #options: Required<ClientConnectionOptions>;
    #disconnectListeners = new Set<() => void>();
    #disconnectMonitorInterval?: ReturnType<typeof setInterval>;

    constructor(options: ClientConnectionOptions) {
        this.#options = {
            authClientLoginOptions: {},
            authClientDisconnectMonitoringInterval: 3000,
            ...options,
        };
        if (this.connected) {
            this.#monitorDisconnect();
        }
    }

    get connected() {
        const identity = this.#options.authClient.getIdentity();
        if (identity.getPrincipal().isAnonymous()) {
            return false;
        }
        const delegationIdentity = identity as DelegationIdentity;
        return isDelegationValid(delegationIdentity.getDelegation());
    }

    async connect(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.#options.authClient.login({
                ...this.#options.authClientLoginOptions,
                onSuccess: () => {
                    this.#monitorDisconnect();
                    resolve();
                },
                onError: (error) =>
                    reject(new AuthClientTransportError(error ?? "AuthClient login failed")),
            });
        });
    }

    async disconnect(): Promise<void> {
        clearInterval(this.#disconnectMonitorInterval);
        await this.#options.authClient.logout();
        this.#disconnectListeners.forEach((listener) => listener());
    }

    addEventListener(event: "disconnect", listener: () => void): () => void {
        switch (event) {
            case "disconnect":
                this.#disconnectListeners.add(listener);
                return () => {
                    this.#disconnectListeners.delete(listener);
                };
        }
    }

    #monitorDisconnect() {
        this.#disconnectMonitorInterval = setInterval(() => {
            if (!this.connected) {
                this.#disconnectListeners.forEach((listener) => listener());
                clearInterval(this.#disconnectMonitorInterval);
            }
        }, this.#options.authClientDisconnectMonitoringInterval);
    }
}
