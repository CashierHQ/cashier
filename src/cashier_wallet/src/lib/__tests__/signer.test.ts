import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock SvelteKit env module
vi.mock('$env/dynamic/public', () => ({
  env: { PUBLIC_ICP_HOST: 'https://icp-api.io' },
}))

// Track the transform registered by agent.addTransform
let capturedTransform: ((req: unknown) => Promise<unknown>) | null = null

const mockAgentAddTransform = vi.fn().mockImplementation((_: string, cb: unknown) => {
  capturedTransform = cb as (req: unknown) => Promise<unknown>
})
const mockAgentCall = vi.fn()
const mockAgentReadState = vi.fn()

vi.mock('@dfinity/agent', () => ({
  HttpAgent: {
    createSync: vi.fn().mockImplementation(() => ({
      addTransform: mockAgentAddTransform,
      call: mockAgentCall,
      readState: mockAgentReadState,
    })),
  },
  Cbor: {
    encode: vi.fn().mockImplementation(() => new Uint8Array([1, 2, 3]).buffer),
  },
  polling: {
    pollForResponse: vi.fn().mockResolvedValue(undefined),
    defaultStrategy: vi.fn().mockReturnValue({}),
  },
}))

vi.mock('@dfinity/principal', () => ({
  Principal: {
    fromText: vi.fn().mockImplementation((t: string) => ({ toText: () => t })),
  },
}))

vi.mock('../identity-manager', () => ({
  getIdentity: vi.fn(),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a mock identity that signs by returning a known buffer. */
function makeMockIdentity(signatureBytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef])) {
  return {
    sign: vi.fn().mockResolvedValue(signatureBytes.buffer),
    getPrincipal: () => ({ toText: () => 'signer-principal' }),
    getIdentity: vi.fn(),
  }
}

describe('signer', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    capturedTransform = null
    // Re-apply the HttpAgent mock implementation after resetModules
    vi.mock('@dfinity/agent', () => ({
      HttpAgent: {
        createSync: vi.fn().mockImplementation(() => ({
          addTransform: mockAgentAddTransform,
          call: mockAgentCall,
          readState: mockAgentReadState,
        })),
      },
      Cbor: {
        encode: vi.fn().mockImplementation(() => new Uint8Array([1, 2, 3]).buffer),
      },
      polling: {
        pollForResponse: vi.fn().mockResolvedValue(undefined),
        defaultStrategy: vi.fn().mockReturnValue({}),
      },
    }))
  })

  // ─── signMessage() ───────────────────────────────────────────────────────────

  describe('signMessage()', () => {
    it('throws "No authenticated identity" when identity is null', async () => {
      const { getIdentity } = await import('../identity-manager')
      vi.mocked(getIdentity).mockReturnValue(null)

      const { signMessage } = await import('../signer')
      await expect(signMessage('hello')).rejects.toThrow('No authenticated identity')
    })

    it('returns the hex-encoded signature and principal text', async () => {
      const { getIdentity } = await import('../identity-manager')
      const identity = makeMockIdentity(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))
      vi.mocked(getIdentity).mockReturnValue(identity as never)

      const { signMessage } = await import('../signer')
      const result = await signMessage('test message')

      expect(result.signature).toBe('deadbeef')
      expect(result.principal).toBe('signer-principal')
    })

    it('correctly hex-encodes single-digit bytes with leading zeros', async () => {
      const { getIdentity } = await import('../identity-manager')
      const identity = makeMockIdentity(new Uint8Array([0x00, 0x0f, 0xff]))
      vi.mocked(getIdentity).mockReturnValue(identity as never)

      const { signMessage } = await import('../signer')
      const result = await signMessage('test')

      expect(result.signature).toBe('000fff')
    })

    it('calls identity.sign() with the UTF-8 encoded message bytes', async () => {
      const { getIdentity } = await import('../identity-manager')
      const identity = makeMockIdentity()
      vi.mocked(getIdentity).mockReturnValue(identity as never)

      const { signMessage } = await import('../signer')
      await signMessage('hello')

      const signedBytes = identity.sign.mock.calls[0]?.[0] as Uint8Array
      const decoded = new TextDecoder().decode(signedBytes)
      expect(decoded).toBe('hello')
    })
  })

  // ─── callCanister() ──────────────────────────────────────────────────────────

  describe('callCanister()', () => {
    it('throws "No authenticated identity" when identity is null', async () => {
      const { getIdentity } = await import('../identity-manager')
      vi.mocked(getIdentity).mockReturnValue(null)

      const { callCanister } = await import('../signer')
      await expect(
        callCanister({ canisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai', method: 'transfer', arg: 'AAAA' }),
      ).rejects.toThrow('No authenticated identity')
    })

    it('returns base64 contentMap and certificate', async () => {
      const { getIdentity } = await import('../identity-manager')
      vi.mocked(getIdentity).mockReturnValue({ getPrincipal: () => ({ toText: () => 'me' }) } as never)

      const requestId = new Uint8Array(32)
      mockAgentCall.mockImplementation(async () => {
        // Simulate the transform running (captures contentMap via Cbor.encode)
        if (capturedTransform) {
          await capturedTransform({ body: { method: 'transfer' } })
        }
        return { requestId }
      })
      mockAgentReadState.mockResolvedValue({ certificate: new Uint8Array([0x01, 0x02]) })

      const { callCanister } = await import('../signer')
      const result = await callCanister({
        canisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
        method: 'transfer',
        arg: 'AAEC', // valid base64
      })

      expect(result.contentMap).toBeTruthy()
      expect(typeof result.contentMap).toBe('string')
      expect(result.certificate).toBeTruthy()
      expect(typeof result.certificate).toBe('string')
    })

    it('throws if contentMap was not captured (transform never fired)', async () => {
      const { getIdentity } = await import('../identity-manager')
      vi.mocked(getIdentity).mockReturnValue({ getPrincipal: () => ({ toText: () => 'me' }) } as never)

      // call() does NOT invoke the transform
      mockAgentCall.mockResolvedValue({ requestId: new Uint8Array(32) })
      mockAgentReadState.mockResolvedValue({ certificate: new Uint8Array([0x01]) })

      const { callCanister } = await import('../signer')
      await expect(
        callCanister({
          canisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
          method: 'transfer',
          arg: 'AAAA',
        }),
      ).rejects.toThrow('contentMap was not captured')
    })

    it('decodes standard base64 arg correctly', async () => {
      const { getIdentity } = await import('../identity-manager')
      vi.mocked(getIdentity).mockReturnValue({ getPrincipal: () => ({ toText: () => 'me' }) } as never)

      // 'AQID' is base64 for [1, 2, 3]
      let capturedArg: Uint8Array | undefined
      mockAgentCall.mockImplementation(async ({ arg }: { arg: Uint8Array }) => {
        capturedArg = arg
        if (capturedTransform) await capturedTransform({ body: {} })
        return { requestId: new Uint8Array(32) }
      })
      mockAgentReadState.mockResolvedValue({ certificate: new Uint8Array([0x01]) })

      const { callCanister } = await import('../signer')
      await callCanister({
        canisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
        method: 'test',
        arg: 'AQID', // [1, 2, 3]
      })

      expect(capturedArg).toEqual(new Uint8Array([1, 2, 3]))
    })

    it('decodes base64url arg (replaces - and _ with + and /)', async () => {
      const { getIdentity } = await import('../identity-manager')
      vi.mocked(getIdentity).mockReturnValue({ getPrincipal: () => ({ toText: () => 'me' }) } as never)

      let capturedArg: Uint8Array | undefined
      mockAgentCall.mockImplementation(async ({ arg }: { arg: Uint8Array }) => {
        capturedArg = arg
        if (capturedTransform) await capturedTransform({ body: {} })
        return { requestId: new Uint8Array(32) }
      })
      mockAgentReadState.mockResolvedValue({ certificate: new Uint8Array([0x01]) })

      const { callCanister } = await import('../signer')

      // base64url for [0xfb, 0xff] is '-_8=' → standard '+/8='
      await callCanister({
        canisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
        method: 'test',
        arg: '-_8=',
      })

      expect(capturedArg?.[0]).toBe(0xfb)
      expect(capturedArg?.[1]).toBe(0xff)
    })
  })
})
