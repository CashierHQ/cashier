<script lang="ts">
  import { onMount, onDestroy } from 'svelte'

  let consentId = ''
  let method = ''
  let params: unknown = undefined
  let dappOrigin = ''
  let loading = true
  let error = ''

  let channel: BroadcastChannel

  onMount(() => {
    consentId = new URLSearchParams(window.location.search).get('id') ?? ''

    if (!consentId) {
      error = 'Missing consent ID — this page should not be opened directly.'
      loading = false
      return
    }

    channel = new BroadcastChannel('wallet-consent')

    channel.onmessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; consentId?: string; method?: string; params?: unknown; dappOrigin?: string }
      if (data?.type === 'consent_data' && data?.consentId === consentId) {
        method = data.method ?? ''
        params = data.params
        dappOrigin = data.dappOrigin ?? ''
        loading = false
      }
    }

    // Ask the hidden iframe (same origin) for the operation details
    channel.postMessage({ type: 'consent_get', consentId })

    // Fallback: if no data arrives within 5 s, show an error
    setTimeout(() => {
      if (loading) {
        error = 'Consent data not received — the request may have expired.'
        loading = false
      }
    }, 5000)
  })

  onDestroy(() => {
    channel?.close()
  })

  function approve() {
    // Notify the hidden iframe (same-origin BroadcastChannel — cannot be faked by DApp)
    channel?.postMessage({ type: 'consent_approved', consentId })
    // Notify the SDK opener using the actual requesting DApp origin as targetOrigin.
    // This ensures delivery works regardless of which DApp triggered the consent flow.
    window.opener?.postMessage({ type: 'consent_approved', consentId }, dappOrigin)
    window.close()
  }

  function reject() {
    channel?.postMessage({ type: 'consent_rejected', consentId })
    window.opener?.postMessage({ type: 'consent_rejected', consentId }, dappOrigin)
    window.close()
  }

  function formatParams(p: unknown): string {
    // Strip consentId from display — it's an internal implementation detail
    if (typeof p === 'object' && p !== null) {
      const { consentId: _omit, ...display } = p as Record<string, unknown>
      return JSON.stringify(display, null, 2)
    }
    return JSON.stringify(p, null, 2)
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
      <h2>Consent Required</h2>

      {#if dappOrigin}
        <div class="origin-badge">
          <span class="origin-label">Requesting site</span>
          <span class="origin-value">{dappOrigin}</span>
        </div>
      {/if}

      <div class="field">
        <span class="label">Method</span>
        <code class="method-badge">{method}</code>
      </div>

      {#if params !== undefined}
        <div class="field">
          <span class="label">Parameters</span>
          <pre class="params">{formatParams(params)}</pre>
        </div>
      {/if}

      <p class="warning">
        Only approve if you trust this request. This action will be executed immediately.
      </p>

      <div class="actions">
        <button class="btn btn-reject" on:click={reject}>Reject</button>
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
    margin: 0.5rem 0 1.25rem;
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

  .field {
    margin-bottom: 1rem;
  }

  .label {
    display: block;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #999;
    margin-bottom: 0.35rem;
  }

  .method-badge {
    display: inline-block;
    background: #eef2ff;
    color: #3730a3;
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    font-size: 0.9rem;
    font-family: monospace;
  }

  .params {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    padding: 0.75rem;
    font-size: 0.78rem;
    font-family: monospace;
    margin: 0;
    overflow-x: auto;
    max-height: 160px;
    white-space: pre-wrap;
    word-break: break-all;
    color: #333;
  }

  .warning {
    font-size: 0.8rem;
    color: #b45309;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    margin: 1.25rem 0 1.25rem;
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
