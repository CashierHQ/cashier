<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import type { IcrcScope, IcrcPermissionState } from '$lib/icrc25-permission-store'

  let requestId = ''
  let requestedScopes: IcrcScope[] = []
  let origin = ''
  let loading = true
  let error = ''

  /** Local UI state: user-chosen permission state per scope */
  let scopeStates: Record<string, IcrcPermissionState> = {}

  let channel: BroadcastChannel

  onMount(() => {
    requestId = new URLSearchParams(window.location.search).get('id') ?? ''

    if (!requestId) {
      error = 'Missing request ID — this page should not be opened directly.'
      loading = false
      return
    }

    channel = new BroadcastChannel('wallet-icrc25-permissions')

    channel.onmessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: string
        requestId?: string
        requestedScopes?: IcrcScope[]
        origin?: string
      }
      if (data?.type === 'icrc25_data' && data?.requestId === requestId) {
        requestedScopes = data.requestedScopes ?? []
        origin = data.origin ?? ''
        // Default: grant all requested scopes
        scopeStates = Object.fromEntries(requestedScopes.map((s) => [s.scope.method, 'granted']))
        loading = false
      }
    }

    // Ask the iframe for the request data
    channel.postMessage({ type: 'icrc25_get', requestId })

    // Fallback: if no data arrives within 5 s, show an error
    setTimeout(() => {
      if (loading) {
        error = 'Request data not received — the request may have expired.'
        loading = false
      }
    }, 5000)
  })

  onDestroy(() => {
    channel?.close()
  })

  function toggleScope(method: string) {
    scopeStates[method] = scopeStates[method] === 'granted' ? 'denied' : 'granted'
    scopeStates = { ...scopeStates }
  }

  function denyAll() {
    scopeStates = Object.fromEntries(requestedScopes.map((s) => [s.scope.method, 'denied']))
    sendConfirmation()
  }

  function approve() {
    sendConfirmation()
  }

  function sendConfirmation() {
    const scopes: IcrcScope[] = requestedScopes.map((s) => ({
      scope: s.scope,
      state: (scopeStates[s.scope.method] ?? 'denied') as IcrcPermissionState,
    }))
    channel?.postMessage({ type: 'icrc25_confirmed', requestId, scopes })
    window.close()
  }

  function formatMethod(method: string): string {
    return method.replace(/_/g, ' ')
  }
</script>

<main>
  {#if loading && !error}
    <div class="card">
      <p class="muted">Loading request details…</p>
    </div>
  {:else if error}
    <div class="card error-card">
      <p>{error}</p>
      <button class="btn btn-reject" on:click={() => window.close()}>Close</button>
    </div>
  {:else}
    <div class="card">
      <h2>Permission Request</h2>

      {#if origin}
        <div class="origin-badge">
          <span class="origin-label">Requesting site</span>
          <span class="origin-value">{origin}</span>
        </div>
      {/if}

      <p class="description">This site is requesting the following permissions:</p>

      <div class="scopes">
        {#each requestedScopes as scope (scope.scope.method)}
          <div class="scope-row">
            <span class="scope-method">{formatMethod(scope.scope.method)}</span>
            <button
              class="scope-toggle"
              class:granted={scopeStates[scope.scope.method] === 'granted'}
              class:denied={scopeStates[scope.scope.method] !== 'granted'}
              on:click={() => toggleScope(scope.scope.method)}
            >
              {scopeStates[scope.scope.method] === 'granted' ? 'Granted' : 'Denied'}
            </button>
          </div>
        {/each}
      </div>

      <p class="warning">
        Only approve permissions for sites you trust. Permissions can be revoked by disconnecting.
      </p>

      <div class="actions">
        <button class="btn btn-reject" on:click={denyAll}>Deny All</button>
        <button class="btn btn-approve" on:click={approve}>Approve</button>
      </div>
    </div>
  {/if}
</main>

<style>
  :global(html),
  :global(body) {
    margin: 0;
    height: 100%;
    overflow: hidden;
    background: #f5f7fa;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  main {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1rem;
    box-sizing: border-box;
  }

  .card {
    background: white;
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
    box-sizing: border-box;
  }

  .error-card {
    border: 1px solid #ffcccc;
    background: #fff8f8;
  }

  h2 {
    margin: 0 0 0.5rem;
    font-size: 1.1rem;
    color: #1a1a2e;
  }

  .origin-badge {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    margin: 0.5rem 0 1rem;
  }

  .origin-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #16a34a;
    font-weight: 600;
  }

  .origin-value {
    font-size: 0.85rem;
    font-family: monospace;
    color: #14532d;
    word-break: break-all;
  }

  .description {
    font-size: 0.85rem;
    color: #555;
    margin: 0 0 0.75rem;
  }

  .scopes {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .scope-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
  }

  .scope-method {
    font-size: 0.85rem;
    font-family: monospace;
    color: #333;
    text-transform: capitalize;
  }

  .scope-toggle {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.6rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    transition: background 0.15s;
    min-width: 60px;
  }

  .scope-toggle.granted {
    background: #dcfce7;
    color: #16a34a;
  }

  .scope-toggle.denied {
    background: #fee2e2;
    color: #dc2626;
  }

  .warning {
    font-size: 0.8rem;
    color: #b45309;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    margin: 0 0 1.25rem;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .btn {
    padding: 0.6rem 1.4rem;
    border-radius: 8px;
    border: none;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .btn:hover {
    opacity: 0.85;
  }

  .btn-approve {
    background: #2563eb;
    color: white;
  }

  .btn-reject {
    background: #f1f3f5;
    color: #444;
  }

  .muted {
    color: #888;
    text-align: center;
  }
</style>
