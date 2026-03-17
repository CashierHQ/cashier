import { Cbor, HttpAgent, polling } from '@dfinity/agent'
import { Principal } from '@dfinity/principal'
import { getIdentity } from './identity-manager'

const IC_HOST = 'https://icp-api.io'

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
  /** Base64-encoded Candid argument bytes. */
  arg: string
}

export interface CallCanisterResult {
  /** Base64-encoded CBOR contentMap of the signed update envelope. */
  contentMap: string
  /** Base64-encoded DER certificate returned from read_state. */
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
  const argBytes = base64ToBytes(params.arg)

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

  const { pollForResponse, defaultStrategy } = polling
  await pollForResponse(agent, canisterId, submitResponse.requestId, defaultStrategy())

  const { certificate } = await agent.readState(canisterId, {
    paths: [
      [
        new TextEncoder().encode('request_status').buffer as ArrayBuffer,
        submitResponse.requestId,
      ],
    ],
  })

  if (!contentMap) throw new Error('contentMap was not captured by transform')

  return {
    contentMap: bytesToBase64(new Uint8Array(contentMap)),
    certificate: bytesToBase64(new Uint8Array(certificate)),
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

/** Decode a standard base64 string to a Uint8Array. */
function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Encode a Uint8Array as a standard base64 string. */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}
