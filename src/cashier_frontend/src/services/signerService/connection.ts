// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

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
          reject(
            new AuthClientTransportError(error ?? "AuthClient login failed"),
          ),
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
