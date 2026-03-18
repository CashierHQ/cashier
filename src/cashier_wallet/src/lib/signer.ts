import { Cbor, HttpAgent, polling } from '@dfinity/agent'
import { Principal } from '@dfinity/principal'
import { env } from '$env/dynamic/public'
import { getIdentity } from './identity-manager'

const IC_HOST = env.PUBLIC_ICP_HOST ?? 'https://icp-api.io'

interface Signable {
  sign(blob: Uint8Array | ArrayBuffer): Promise<ArrayBuffer>
  getPrincipal(): { toText(): string }
}

export interface SignResult {
  /** Hex-encoded signature bytes produced by the delegated identity. */
  signature: string
  /** Textual principal of the identity that produced the signature. */
  principal: string
}

/**
 * Signs an arbitrary UTF-8 message using the current delegated identity.
 * The delegation chain is transparently handled by @dfinity/identity.
 */
export async function signMessage(message: string): Promise<SignResult> {
  const identity = getIdentity() as Signable | null
  if (!identity) throw new Error('No authenticated identity')

  const encoder = new TextEncoder()
  const bytes = encoder.encode(message)

  const signatureBytes = await identity.sign(bytes)

  return {
    signature: bufferToHex(signatureBytes),
    principal: identity.getPrincipal().toText(),
  }
}

// ── ICRC-49 canister call ─────────────────────────────────────────────────

export interface CallCanisterParams {
  /** Textual canister ID of the target canister. */
  canisterId: string
  /** Method name to call. */
  method: string
  /** Base64url-encoded Candid argument bytes (ICRC-49). */
  arg: string
}

export interface CallCanisterResult {
  /** Base64url-encoded CBOR contentMap of the signed update envelope (ICRC-49). */
  contentMap: string
  /** Base64url-encoded IC certificate returned from read_state (ICRC-49). */
  certificate: string
}

/**
 * Submit an authenticated update call to a canister, poll for a reply, and
 * return the raw CBOR contentMap plus the IC certificate — the exact shape
 * required by the ICRC-49 response schema.
 *
 * Mirrors the icrc49_call_canister implementation in IIChannel.ts.
 */
export async function callCanister(
  params: CallCanisterParams,
): Promise<CallCanisterResult> {
  const identity = getIdentity()
  if (!identity) throw new Error('No authenticated identity')

  const canisterId = Principal.fromText(params.canisterId)
  const argBytes = base64UrlToBytes(params.arg)

  console.log(
    `[cashier-wallet-instance] Submitting update call — ${params.method} on ${params.canisterId} via ${IC_HOST}`,
  )

  // Create a fresh agent so the addTransform callback doesn't leak across calls
  const agent = HttpAgent.createSync({ identity, host: IC_HOST })

  let contentMap: ArrayBuffer | undefined
  agent.addTransform('update', async (agentRequest) => {
    contentMap = Cbor.encode(agentRequest.body)
    return agentRequest
  })

  const submitResponse = await agent.call(canisterId, {
    effectiveCanisterId: canisterId,
    methodName: params.method,
    arg: argBytes,
  })
  console.log('[cashier-wallet-instance] Call submitted to IC, polling for response...')

  const { pollForResponse, defaultStrategy } = polling
  await pollForResponse(agent, canisterId, submitResponse.requestId, defaultStrategy())
  console.log('[cashier-wallet-instance] IC response received, reading certificate...')

  const { certificate } = await agent.readState(canisterId, {
    paths: [
      [
        new TextEncoder().encode('request_status').buffer as ArrayBuffer,
        submitResponse.requestId,
      ],
    ],
  })

  if (!contentMap) throw new Error('contentMap was not captured by transform')

  console.log('[cashier-wallet-instance] Certificate obtained — ICRC-49 result ready')
  return {
    contentMap: bytesToBase64Url(new Uint8Array(contentMap)),
    certificate: bytesToBase64Url(new Uint8Array(certificate)),
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Convert an ArrayBuffer to a lowercase hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Decode a base64url string (RFC 4648 §5, no padding) to a Uint8Array.
 * Also accepts standard base64 with `+`/`/` for compatibility.
 * ICRC-49 requires base64url for all binary fields.
 */
function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const binary = atob(padded)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

/**
 * Encode a Uint8Array as a base64url string (RFC 4648 §5, no padding).
 * ICRC-49 requires base64url for contentMap and certificate.
 */
function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
