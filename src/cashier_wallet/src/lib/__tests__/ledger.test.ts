import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockIcrc1Transfer = vi.fn()
const mockIcrc1BalanceOf = vi.fn()
const mockActorInstance = {
  icrc1_transfer: mockIcrc1Transfer,
  icrc1_balance_of: mockIcrc1BalanceOf,
}

vi.mock('@dfinity/agent', () => ({
  HttpAgent: { createSync: vi.fn().mockReturnValue({}) },
  Actor: {
    createActor: vi.fn().mockReturnValue(mockActorInstance),
  },
}))

vi.mock('@dfinity/candid', () => ({
  IDL: {
    Record: vi.fn().mockReturnValue({}),
    Variant: vi.fn().mockReturnValue({}),
    Opt: vi.fn().mockReturnValue({}),
    Vec: vi.fn().mockReturnValue({}),
    Nat: {},
    Nat8: {},
    Nat64: {},
    Text: {},
    Null: {},
    Principal: {},
    Func: vi.fn().mockReturnValue({}),
    Service: vi.fn().mockReturnValue({}),
  },
}))

vi.mock('@dfinity/principal', () => ({
  Principal: {
    fromText: vi.fn().mockImplementation((text: string) => ({ text, toText: () => text })),
  },
}))

vi.mock('../identity-manager', () => ({
  getIdentity: vi.fn(),
}))

describe('ledger', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    // Re-set the default Actor mock after resetModules
  })

  // ─── icrc1Transfer() ─────────────────────────────────────────────────────────

  describe('icrc1Transfer()', () => {
    it('throws when no authenticated identity is available', async () => {
      const { getIdentity } = await import('../identity-manager')
      vi.mocked(getIdentity).mockReturnValue(null)

      const { icrc1Transfer } = await import('../ledger')

      await expect(
        icrc1Transfer({ canisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai', to: 'abc', amount: 100n }),
      ).rejects.toThrow('No authenticated identity')
    })

    it('returns { blockIndex } string on Ok result', async () => {
      const { getIdentity } = await import('../identity-manager')
      vi.mocked(getIdentity).mockReturnValue({ getPrincipal: () => ({ toText: () => 'me' }) } as never)

      const { Actor } = await import('@dfinity/agent')
      vi.mocked(Actor.createActor).mockReturnValue({ ...mockActorInstance } as never)
      mockIcrc1Transfer.mockResolvedValue({ Ok: 123n })

      const { icrc1Transfer } = await import('../ledger')
      const result = await icrc1Transfer({
        canisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
        to: 'recipient',
        amount: 1_000_000n,
      })

      expect(result).toEqual({ blockIndex: '123' })
    })

    it('returns { error } string describing the error variant', async () => {
      const { getIdentity } = await import('../identity-manager')
      vi.mocked(getIdentity).mockReturnValue({ getPrincipal: () => ({ toText: () => 'me' }) } as never)

      const { Actor } = await import('@dfinity/agent')
      vi.mocked(Actor.createActor).mockReturnValue({ ...mockActorInstance } as never)
      mockIcrc1Transfer.mockResolvedValue({
        Err: { InsufficientFunds: { balance: 500n } },
      })

      const { icrc1Transfer } = await import('../ledger')
      const result = await icrc1Transfer({
        canisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
        to: 'recipient',
        amount: 1_000_000n,
      })

      expect(result.error).toContain('InsufficientFunds')
    })

    it('serializes BigInt values inside error details', async () => {
      const { getIdentity } = await import('../identity-manager')
      vi.mocked(getIdentity).mockReturnValue({ getPrincipal: () => ({ toText: () => 'me' }) } as never)

      const { Actor } = await import('@dfinity/agent')
      vi.mocked(Actor.createActor).mockReturnValue({ ...mockActorInstance } as never)
      mockIcrc1Transfer.mockResolvedValue({
        Err: { BadFee: { expected_fee: 10_000n } },
      })

      const { icrc1Transfer } = await import('../ledger')
      const result = await icrc1Transfer({
        canisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
        to: 'recipient',
        amount: 1_000_000n,
      })

      // BigInt is converted to string in JSON
      expect(result.error).toContain('10000')
      expect(result.error).not.toContain('[object BigInt]')
    })
  })

  // ─── icrc1BalanceOf() ────────────────────────────────────────────────────────

  describe('icrc1BalanceOf()', () => {
    it('throws when no authenticated identity is available', async () => {
      const { getIdentity } = await import('../identity-manager')
      vi.mocked(getIdentity).mockReturnValue(null)

      const { icrc1BalanceOf } = await import('../ledger')

      await expect(
        icrc1BalanceOf('ryjl3-tyaaa-aaaaa-aaaba-cai', 'owner-principal'),
      ).rejects.toThrow('No authenticated identity')
    })

    it('returns the balance bigint from the actor query', async () => {
      const { getIdentity } = await import('../identity-manager')
      vi.mocked(getIdentity).mockReturnValue({ getPrincipal: () => ({ toText: () => 'me' }) } as never)

      const { Actor } = await import('@dfinity/agent')
      vi.mocked(Actor.createActor).mockReturnValue({ ...mockActorInstance } as never)
      mockIcrc1BalanceOf.mockResolvedValue(42_000_000n)

      const { icrc1BalanceOf } = await import('../ledger')
      const balance = await icrc1BalanceOf('ryjl3-tyaaa-aaaaa-aaaba-cai', 'owner-principal')

      expect(balance).toBe(42_000_000n)
    })

    it('calls actor.icrc1_balance_of with the parsed owner principal', async () => {
      const { getIdentity } = await import('../identity-manager')
      vi.mocked(getIdentity).mockReturnValue({ getPrincipal: () => ({ toText: () => 'me' }) } as never)

      const { Actor } = await import('@dfinity/agent')
      vi.mocked(Actor.createActor).mockReturnValue({ ...mockActorInstance } as never)
      mockIcrc1BalanceOf.mockResolvedValue(0n)

      const { Principal } = await import('@dfinity/principal')

      const { icrc1BalanceOf } = await import('../ledger')
      await icrc1BalanceOf('ryjl3-tyaaa-aaaaa-aaaba-cai', 'owner-principal')

      expect(Principal.fromText).toHaveBeenCalledWith('owner-principal')
      expect(mockIcrc1BalanceOf).toHaveBeenCalledWith(
        expect.objectContaining({ owner: expect.anything(), subaccount: [] }),
      )
    })
  })
})
