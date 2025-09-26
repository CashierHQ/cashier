import { type Channel, type Transport } from "@slide-computer/signer";
import { IIChannel } from "./IIChannel";
import { HttpAgent } from "@dfinity/agent";


// TODO: Remove this if all PRs resolve
// - https://github.com/slide-computer/signer-js/pull/9
// - https://github.com/slide-computer/signer-js/pull/10
// - https://github.com/slide-computer/signer-js/pull/11
/**
 * Error type used by the AgentTransport implementation.
 */
export class IITransportError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, IITransportError.prototype);
  }
}

interface AgentTransportOptions {
  /**
   * Used to make canister calls
   * @default uses anonymous {@link HttpAgent} by default
   */
  agent: HttpAgent;
}

// TODO: Remove this if all PRs resolve
// - https://github.com/slide-computer/signer-js/pull/9
// - https://github.com/slide-computer/signer-js/pull/10
// - https://github.com/slide-computer/signer-js/pull/11
/**
 * Transport implementation that wraps an {@link HttpAgent}
 * Transport for communication between relying party and signer
 */
export class IITransport implements Transport {
  // Internal flag used to prevent direct construction via `new`.
  static #isInternalConstructing: boolean = false;
  readonly #agent: HttpAgent;

  private constructor(agent: HttpAgent) {
    const throwError = !IITransport.#isInternalConstructing;
    IITransport.#isInternalConstructing = false;
    if (throwError) {
      throw new IITransportError("AgentTransport is not constructable");
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
  static async create(options?: AgentTransportOptions): Promise<IITransport> {
    const agent = options?.agent ?? (await HttpAgent.create());

    IITransport.#isInternalConstructing = true;
    return new IITransport(agent);
  }

  /**
   * Establish a channel backed by the transport's `HttpAgent`.
   *
   * Returns a fresh `AgentChannel` which will forward JSON-RPC requests to
   * the agent and emit `response`/`close` events.
   */
  async establishChannel(): Promise<Channel> {
    return new IIChannel(this.#agent);
  }
}
