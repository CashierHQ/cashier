import { DEFAULT_TIMEOUT_MS } from './constants';
import { WalletError } from './errors';
import type { PendingRequest, RpcRequest, RpcResponse } from './types';

/**
 * JSON-RPC 2.0 client over postMessage.
 * Works with both iframe contentWindow and popup window references.
 * No framework dependencies — plain TypeScript.
 */
export class RpcClient {
  private pending = new Map<string, PendingRequest>();
  private target: Window | null = null;
  private readonly targetOrigin: string;
  private readonly listener: (e: MessageEvent) => void;

  constructor(targetOrigin: string) {
    this.targetOrigin = targetOrigin;
    this.listener = this.handleResponse.bind(this);
    window.addEventListener('message', this.listener);
  }

  /** Set or replace the target window (iframe contentWindow or popup). */
  connect(target: Window): void {
    this.target = target;
  }

  /**
   * Send a JSON-RPC 2.0 request and await the response.
   * @param method - RPC method name to invoke on the wallet.
   * @param params - Optional parameters forwarded to the wallet.
   * @param timeoutMs - Max milliseconds to wait for a response (default: `DEFAULT_TIMEOUT_MS`).
   * @returns The `result` field from the wallet's JSON-RPC response.
   * @throws {WalletError} When the wallet returns an RPC-level error object.
   * @throws {Error} When no response arrives within `timeoutMs`.
   */
  async request(
    method: string,
    params?: unknown,
    timeoutMs = DEFAULT_TIMEOUT_MS
  ): Promise<unknown> {
    if (!this.target) throw new Error('RpcClient: no target connected');

    const id = crypto.randomUUID();

    console.log(`RPC Request: ${method} (id: ${id})`, params);

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });

      const msg: RpcRequest = { jsonrpc: '2.0', id, method, params };
      this.target!.postMessage(msg, { targetOrigin: this.targetOrigin });

      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`RPC timeout: ${method} (${timeoutMs}ms)`));
        }
      }, timeoutMs);
    });
  }

  /** Remove the postMessage listener and clear all pending requests. */
  destroy(): void {
    window.removeEventListener('message', this.listener);
    this.pending.forEach(({ reject }) =>
      reject(new Error('RpcClient destroyed'))
    );
    this.pending.clear();
  }

  /**
   * Handle an incoming `postMessage` event from the wallet.
   * Ignores messages from unexpected origins or with non-RPC payloads.
   * Resolves or rejects the matching pending request promise.
   */
  private handleResponse(event: MessageEvent): void {
    if (event.origin !== this.targetOrigin) return;

    const res = event.data as RpcResponse;
    if (res?.jsonrpc !== '2.0' || !res.id) return;

    const pending = this.pending.get(res.id);
    if (!pending) return;

    this.pending.delete(res.id);

    if (res.error) {
      pending.reject(new WalletError(res.error.message, res.error.code));
    } else {
      pending.resolve(res.result);
    }
  }
}
