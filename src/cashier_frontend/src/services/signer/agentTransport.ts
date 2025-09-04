import { type Channel, type Transport } from "@slide-computer/signer";
import { AgentChannel } from "./agentChannel";
import { HttpAgent } from "@dfinity/agent";

/**
 * Error type used by the AgentTransport implementation.
 */
export class AgentTransportError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, AgentTransportError.prototype);
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
export class AgentTransport implements Transport {
  // Internal flag used to prevent direct construction via `new`.
  static #isInternalConstructing: boolean = false;
  readonly #agent: HttpAgent;

  private constructor(agent: HttpAgent) {
    const throwError = !AgentTransport.#isInternalConstructing;
    AgentTransport.#isInternalConstructing = false;
    if (throwError) {
      throw new AgentTransportError("AgentTransport is not constructable");
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
  ): Promise<AgentTransport> {
    const agent = options?.agent ?? (await HttpAgent.create());

    AgentTransport.#isInternalConstructing = true;
    return new AgentTransport(agent);
  }

  /**
   * Establish a channel backed by the transport's `HttpAgent`.
   *
   * Returns a fresh `AgentChannel` which will forward JSON-RPC requests to
   * the agent and emit `response`/`close` events.
   */
  async establishChannel(): Promise<Channel> {
    return new AgentChannel(this.#agent);
  }
}
