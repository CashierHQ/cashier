<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { marked } from 'marked'
  import type { Consent21Status } from '$lib/icrc21-consent-store'
  import type { icrc21_consent_info, icrc21_consent_message } from '@dfinity/oisy-wallet-signer'

  let requestId = ''
  let status: Consent21Status = 'loading'
  let consentInfo: icrc21_consent_info | undefined = undefined
  let origin = ''
  let loadError = ''
  let initError = ''

  let channel: BroadcastChannel

  onMount(() => {
    requestId = new URLSearchParams(window.location.search).get('id') ?? ''

    if (!requestId) {
      initError = 'Missing request ID — this page should not be opened directly.'
      return
    }

    channel = new BroadcastChannel('wallet-icrc21-consent')

    channel.onmessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: string
        requestId?: string
        status?: Consent21Status
        consentInfo?: icrc21_consent_info
        origin?: string
        errorDetails?: unknown
      }
      if (!data?.requestId || data.requestId !== requestId) return

      if (data.type === 'icrc21_data' || data.type === 'icrc21_status_update') {
        status = data.status ?? 'loading'
        if (data.status === 'result') {
          consentInfo = data.consentInfo
          origin = (data as { origin?: string }).origin ?? origin
        } else if (data.status === 'error') {
          loadError = formatErrorDetails(
            (data as { errorDetails?: unknown }).errorDetails,
          )
        } else if (data.status === 'loading' && (data as { origin?: string }).origin) {
          origin = (data as { origin?: string }).origin ?? ''
        }
      }
    }

    // Ask the iframe for the current state
    channel.postMessage({ type: 'icrc21_get', requestId })

    // Fallback: show error if no data arrives within 5 s
    setTimeout(() => {
      if (status === 'loading' && !consentInfo) {
        initError = 'Could not load request details — the request may have expired.'
      }
    }, 5000)
  })

  onDestroy(() => {
    channel?.close()
  })

  function approve() {
    channel?.postMessage({ type: 'icrc21_approved', requestId })
    window.close()
  }

  function reject() {
    channel?.postMessage({ type: 'icrc21_rejected', requestId })
    window.close()
  }

  function consentMessageHtml(msg: icrc21_consent_message): string {
    if ('GenericDisplayMessage' in msg) {
      return marked.parse(msg.GenericDisplayMessage) as string
    }
    // LineDisplayMessage: plain-text structured lines (designed for hardware wallets)
    if ('LineDisplayMessage' in msg) {
      return msg.LineDisplayMessage.pages
        .map((page) => `<p>${page.lines.map(escapeHtml).join('<br>')}</p>`)
        .join('')
    }
    return ''
  }

  function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  function formatErrorDetails(details: unknown): string {
    if (!details) return 'An unknown error occurred while fetching transaction details.'
    if (typeof details === 'string') return details
    try {
      return JSON.stringify(details, null, 2)
    } catch {
      return String(details)
    }
  }
</script>

<main>
  {#if initError}
    <div class="card error-card">
      <p>{initError}</p>
      <button class="btn btn-reject" on:click={() => window.close()}>Close</button>
    </div>
  {:else if status === 'loading'}
    <div class="card">
      <h2>Transaction Details</h2>
      {#if origin}
        <div class="origin-badge">
          <span class="origin-label">Requesting site</span>
          <span class="origin-value">{origin}</span>
        </div>
      {/if}
      <div class="loading-state">
        <div class="spinner" aria-label="Loading" role="status"></div>
        <p class="muted">Fetching transaction details from canister…</p>
      </div>
      <div class="actions">
        <button class="btn btn-reject" on:click={reject}>Cancel</button>
      </div>
    </div>
  {:else if status === 'result' && consentInfo}
    <div class="card">
      <h2>Approve Transaction</h2>

      {#if origin}
        <div class="origin-badge">
          <span class="origin-label">Requesting site</span>
          <span class="origin-value">{origin}</span>
        </div>
      {/if}

      <div class="field">
        <span class="label">Transaction details</span>
        <div class="consent-prose">{@html consentMessageHtml(consentInfo.consent_message)}</div>
      </div>

      <p class="warning">
        Review the transaction details carefully. Approving will execute this action immediately.
      </p>

      <div class="actions">
        <button class="btn btn-reject" on:click={reject}>Reject</button>
        <button class="btn btn-approve" on:click={approve}>Approve</button>
      </div>
    </div>
  {:else if status === 'error'}
    <div class="card">
      <h2>Transaction Details Unavailable</h2>

      {#if origin}
        <div class="origin-badge">
          <span class="origin-label">Requesting site</span>
          <span class="origin-value">{origin}</span>
        </div>
      {/if}

      <div class="error-state">
        <p class="error-text">
          Could not fetch transaction details from the canister. The canister may not support ICRC-21.
        </p>
        {#if loadError}
          <pre class="error-details">{loadError}</pre>
        {/if}
      </div>

      <p class="warning">
        Transaction details could not be verified. The request was automatically cancelled for your safety.
      </p>

      <div class="actions">
        <button class="btn btn-reject" on:click={() => window.close()}>Close</button>
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
    overflow-y: auto;
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

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.5rem 0;
    gap: 0.75rem;
  }

  .spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #e2e8f0;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
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

  .consent-prose {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    padding: 0.75rem 1rem;
    font-size: 0.85rem;
    color: #1a1a2e;
    max-height: 220px;
    overflow-y: auto;
    line-height: 1.5;
  }

  .consent-prose :global(h1),
  .consent-prose :global(h2),
  .consent-prose :global(h3) {
    font-size: 0.95rem;
    margin: 0 0 0.6rem;
    color: #111;
  }

  .consent-prose :global(p) {
    margin: 0.4rem 0;
  }

  .consent-prose :global(strong) {
    font-weight: 600;
    color: #1a1a2e;
  }

  .consent-prose :global(code) {
    font-family: monospace;
    font-size: 0.78rem;
    background: #eef0f2;
    border-radius: 3px;
    padding: 0.1em 0.3em;
    word-break: break-all;
  }

  .error-state {
    margin-bottom: 1rem;
  }

  .error-text {
    font-size: 0.85rem;
    color: #dc2626;
    margin: 0 0 0.5rem;
  }

  .error-details {
    background: #fff8f8;
    border: 1px solid #ffcccc;
    border-radius: 6px;
    padding: 0.5rem;
    font-size: 0.72rem;
    font-family: monospace;
    margin: 0;
    overflow-x: auto;
    max-height: 80px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-all;
    color: #991b1b;
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
    margin: 0;
    font-size: 0.85rem;
  }
</style>
