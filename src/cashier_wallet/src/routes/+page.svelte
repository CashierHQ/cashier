<script lang="ts">
  import { onMount } from 'svelte'
  import { initRpcHandler } from '$lib/rpc-handler'
  import { initIcrc29Handler, setWalletReady } from '$lib/icrc29-handler'
  import { login, logout, isAuthenticated, getIdentity, initAuthClient } from '$lib/identity-manager'

  let authenticated = false
  let principal = ''
  let requestLog: { time: string; method: string }[] = []
  let isLoginPopup = false
  let loginPending = false
  let derivationOrigin: string | undefined

  onMount(async () => {
    isLoginPopup = !!window.opener
    // Read derivationOrigin forwarded by CashierWalletSignerAdapter via URL param.
    // This ensures II derives the same principal as a direct DApp login.
    derivationOrigin = new URLSearchParams(window.location.search).get('derivationOrigin') ?? undefined

    // Init auth client to restore session
    await initAuthClient()
    authenticated = await isAuthenticated()
    if (authenticated) {
      principal = getIdentity()?.getPrincipal().toText() ?? ''
    }

    if (!isLoginPopup) {
      // Start the legacy custom-protocol listener (used by apps/dapp)
      initRpcHandler((method) => {
        requestLog = [
          { time: new Date().toLocaleTimeString(), method },
          ...requestLog,
        ].slice(0, 50)
      })

      // Start the ICRC-29/25/27/49 listener (used by cashier_frontend_new via PNP)
      setWalletReady()
      initIcrc29Handler()
    }

    // Reply to wallet_check_auth polls from the DApp adapter.
    // This handles the case where window.opener is null after a cross-origin
    // II redirect (COOP headers), allowing the DApp to still receive the
    // wallet_auth_complete message via event.source.postMessage.
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.data?.type !== 'wallet_check_auth') return
      if (authenticated && principal) {
        ;(event.source as Window).postMessage(
          { type: 'wallet_auth_complete', principal },
          event.origin,
        )
      }
    })

    // Auto-trigger II when opened as a login popup by the SDK or PNP adapter
    if (isLoginPopup) {
      if (authenticated) {
        // Already authenticated — notify opener and close
        window.opener?.postMessage({ type: 'wallet_auth_complete', principal }, '*')
        window.close()
      } else {
        // Not yet authenticated — trigger II login flow
        loginPending = true
        await handleLogin()
        loginPending = false
      }
    }
  })

  async function handleLogin() {
    const result = await login(derivationOrigin)
    authenticated = result.ok
    if (result.ok) {
      principal = getIdentity()?.getPrincipal().toText() ?? ''

      // Notify the opener and auto-close. We use '*' as targetOrigin because
      // any DApp can trigger the login popup; the message only carries the
      // principal which the user is explicitly sharing by completing login.
      if (window.opener) {
        window.opener.postMessage({ type: 'wallet_auth_complete', principal }, '*')
        window.close()
      }
    }
  }

  async function handleLogout() {
    await logout()
    authenticated = false
    principal = ''
  }
</script>

{#if isLoginPopup}
  <!-- Shown when the wallet is opened as a login popup by the SDK -->
  <main style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f7fa;">
    <div style="text-align: center; padding: 2rem;">
      {#if loginPending}
        <p style="font-size: 1.1rem; color: #555;">Opening Internet Identity…</p>
        <p style="font-size: 0.85rem; color: #999; margin-top: 0.5rem;">Please complete authentication in the Internet Identity window.</p>
      {:else if authenticated}
        <p style="font-size: 1.1rem; color: green;">Authentication complete. Closing…</p>
      {:else}
        <p style="font-size: 1.1rem; color: #555;">Starting authentication…</p>
      {/if}
    </div>
  </main>
{:else}
  <!-- Shown when the wallet is running as a hidden iframe -->
  <main style="font-family: monospace; padding: 1rem; max-width: 600px;">
    <h1>Wallet <small style="font-size: 0.6em; color: #888;">port 5177</small></h1>

    <!-- Auth section -->
    <section style="margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #ccc; border-radius: 6px;">
      <h2>Identity</h2>
      {#if authenticated}
        <p style="color: green;">Authenticated</p>
        <p style="word-break: break-all; font-size: 0.85em;">Principal: {principal}</p>
        <button on:click={handleLogout}>Logout</button>
      {:else}
        <p style="color: #888;">Not authenticated</p>
        <button on:click={handleLogin}>Login with Internet Identity</button>
      {/if}
    </section>

    <!-- Request log -->
    <section style="padding: 1rem; border: 1px solid #ccc; border-radius: 6px;">
      <h2>Incoming RPC Requests</h2>
      {#if requestLog.length === 0}
        <p style="color: #888; font-size: 0.85em;">Waiting for postMessage requests...</p>
      {:else}
        <ul style="list-style: none; padding: 0; margin: 0;">
          {#each requestLog as entry}
            <li style="padding: 2px 0; font-size: 0.85em;">
              <span style="color: #888;">[{entry.time}]</span>
              <span style="color: #0066cc;">{entry.method}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  </main>
{/if}
