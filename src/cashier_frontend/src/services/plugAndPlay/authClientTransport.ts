import { type Channel, type Transport } from "@slide-computer/signer";
import { AuthClientChannel } from "./authClientChannel";
import { HttpAgent } from "@dfinity/agent";

/**
 * Error type used by the AgentTransport implementation.
 */
export class AuthClientTransportError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, AuthClientTransportError.prototype);
  }
}

interface AgentTransportOptions {
  /**
   * Used to make canister calls
   * @default uses anonymous {@link HttpAgent} by default
   */
  agent: HttpAgent;
}

/**
 * Transport implementation that wraps an {@link HttpAgent}
 * Transport for communication between relying party and signer
 */
export class AuthClientTransport implements Transport {
  // Internal flag used to prevent direct construction via `new`.
  static #isInternalConstructing: boolean = false;
  readonly #agent: HttpAgent;

  private constructor(agent: HttpAgent) {
    const throwError = !AuthClientTransport.#isInternalConstructing;
    AuthClientTransport.#isInternalConstructing = false;
    if (throwError) {
      throw new AuthClientTransportError("AgentTransport is not constructable");
    }
    this.#agent = agent;
  }

  /**
   * Async factory that returns a ready-to-use `AgentTransport`.
   *
   * Behavior:
   * - If `options.agent` is provided that agent is used.
   * - Otherwise an anonymous {@link HttpAgent} is created.
   */
  static async create(
    options?: AgentTransportOptions,
  ): Promise<AuthClientTransport> {
    const agent = options?.agent ?? (await HttpAgent.create());

    AuthClientTransport.#isInternalConstructing = true;
    return new AuthClientTransport(agent);
  }

  /**
   * Establish a channel backed by the transport's `HttpAgent`.
   *
   * Returns a fresh `AgentChannel` which will forward JSON-RPC requests to
   * the agent and emit `response`/`close` events.
   */
  async establishChannel(): Promise<Channel> {
    return new AuthClientChannel(this.#agent);
  }
}
