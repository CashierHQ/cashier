import type { JsonValue } from "@dfinity/candid";
import { Channel, JsonError, JsonRequest, JsonResponse, Transport } from "@slide-computer/signer";

export class SignerError extends Error {
    public code: number;
    public data?: JsonValue;

    constructor(error: JsonError) {
        super(error.message);
        Object.setPrototypeOf(this, SignerError.prototype);

        this.code = error.code;
        this.data = error.data;
    }
}

const wrapTransportError = (error: unknown) =>
    new SignerError({
        code: 4000,
        message: error instanceof Error ? error.message : "Network error",
    });

export interface SignerOptions<T extends Transport> {
    /**
     * The transport used to send and receive messages
     */
    transport: T;
    /**
     * Automatically close transport channel after response has been received
     * @default true
     */
    autoCloseTransportChannel?: boolean;
    /**
     * Close transport channel after a given duration in ms
     * @default 200
     */
    closeTransportChannelAfter?: number;
    /**
     * Get random uuid implementation for request message ids
     * @default globalThis.crypto
     */
    crypto?: Pick<Crypto, "randomUUID">;
    /**
     * Origin to use to derive identity
     */
    derivationOrigin?: string;
}

export class Signer<T extends Transport = Transport> {
    readonly #options: Required<Omit<SignerOptions<T>, "derivationOrigin">> &
        Pick<SignerOptions<T>, "derivationOrigin">;
    #channel?: Channel;
    #establishingChannel?: Promise<void>;
    #scheduledChannelClosure?: ReturnType<typeof setTimeout>;

    constructor(options: SignerOptions<T>) {
        this.#options = {
            autoCloseTransportChannel: true,
            closeTransportChannelAfter: 200,
            crypto: globalThis.crypto,
            ...options,
        };
    }

    get transport(): T {
        return this.#options.transport;
    }

    async openChannel(): Promise<Channel> {
        // Stop any existing channel from being closed
        clearTimeout(this.#scheduledChannelClosure);

        // Wait for ongoing establishing of a channel
        if (this.#establishingChannel) {
            await this.#establishingChannel;
        }

        // Reuse existing channel
        if (this.#channel && !this.#channel.closed) {
            return this.#channel;
        }

        // Establish a new transport channel
        const channel = this.#options.transport.establishChannel();
        // Indicate that transport channel is being established
        this.#establishingChannel = channel.then(() => {}).catch(() => {});
        // Clear previous transport channel
        this.#channel = undefined;
        // Assign transport channel once established
        this.#channel = await channel.catch((error) => {
            throw wrapTransportError(error);
        });
        // Remove transport channel being established indicator
        this.#establishingChannel = undefined;
        // Return established channel
        return this.#channel;
    }

    async closeChannel(): Promise<void> {
        await this.#channel?.close();
    }

    async transformRequest<T extends JsonRequest>(request: T): Promise<T> {
        if (this.#options.derivationOrigin) {
            return {
                ...request,
                params: {
                    ...request.params,
                    icrc95DerivationOrigin: this.#options.derivationOrigin,
                },
            };
        }
        return request;
    }

    async sendRequest<T extends JsonRequest, S extends JsonResponse>(request: T): Promise<S> {
        // Establish new or re-use existing transport channel
        const channel = await this.openChannel();

        return new Promise<S>(async (resolve, reject) => {
            // Listen on transport channel for incoming response
            const responseListener = channel.addEventListener("response", async (response) => {
                if (response.id !== request.id) {
                    // Ignore responses that don't match the request id
                    return;
                }

                // Stop listening to events once a valid response has been received
                responseListener();
                closeListener();

                // Return response
                resolve(response as S);

                // Close transport channel after a certain timeout
                if (this.#options.autoCloseTransportChannel) {
                    this.#scheduledChannelClosure = setTimeout(() => {
                        if (!channel.closed) {
                            channel.close();
                        }
                    }, this.#options.closeTransportChannelAfter);
                }
            });

            // Monitor if channel is closed before a response has been received
            const closeListener = channel.addEventListener("close", () => {
                // Stop listening to events once a channel is closed
                responseListener();
                closeListener();

                // Throw error if channel is closed before response is received
                reject(
                    new SignerError({
                        code: 4000,
                        message: "Channel was closed before a response was received",
                    }),
                );
            });

            // Send outgoing request over transport channel
            try {
                await channel.send(await this.transformRequest(request));
            } catch (error) {
                responseListener();
                closeListener();
                reject(wrapTransportError(error));
            }
        });
    }
}
