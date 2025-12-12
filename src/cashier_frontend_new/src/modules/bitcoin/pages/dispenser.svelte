<script lang="ts">
  import { authState } from '$modules/auth/state/auth.svelte';
  import { bitcoinStore } from '../bitcoinStore.svelte';
  import { REDEEM_FEE } from '../constants';
  import type { RuneBalanceInfo } from '../types';

  let btcWalletAddress = $state('');
  let isConnected = $state(false);
  let isImporting = $state(false);
  let isExporting = $state(false);
  let importAmount = $state(0);
  let exportAmount = $state(0);
  let successMessage = $state('');
  let errorMessage = $state('');

  const unisatApiKey = '2f77b9bfb762985b3923223384b77a04c24231400035bf6579a6912c44831613';
  const runeBlock = '840000';
  const runeTx = '3';
  const runeId = `${runeBlock}:${runeTx}`;

  let receiverPrincipalId: string = $derived.by(() => {
      return authState.account?.owner || "No principal";
  });

  let btcDepositAddress = $state("");
  $effect(() => {
    if (receiverPrincipalId) {
      bitcoinStore.getBtcAddress(receiverPrincipalId).then((address) => {
        btcDepositAddress = address;
      });
    }
  })

  let runeBalanceInfos = $state<RuneBalanceInfo[]>([]);
  $effect(() => {
    if (isConnected && btcWalletAddress) {
      bitcoinStore.getRunesList(btcWalletAddress, unisatApiKey).then((runes) => {
        runeBalanceInfos = runes;
      });
    }
  })

  let wrappedRunesBalance = $state<Number>(0);
  $effect(() => {
    if (receiverPrincipalId) {
      bitcoinStore.getWrappedRunesBalance().then((balance) => {
        wrappedRunesBalance = Number(balance) / 100_000; // Convert from sats to Runes
      });   
    }
  })

  async function handleImport() {
    if (!btcDepositAddress) {
      alert('Deposit address not available');
      return;
    }
    
    if (!importAmount || Number(importAmount) <= 0) {
      alert('Please enter a valid importing amount');
      return;
    }
    
    isImporting = true;
    
    try {
      const unisat = getUnisat();
      const transferAmount = BigInt(importAmount) * BigInt(100_000); // Convert to sats
      
      
      // Get UTXOs
      /*
      const utxos = await getUTXOs();
      
      if (utxos.length === 0) {
        throw new Error('No UTXOs available. You need testnet BTC.');
      }
      
      // Select UTXO with enough value
      const selectedUtxo = utxos.find(u => u.value > 20000) || utxos[0];
      
      if (selectedUtxo.value < 20000) {
        throw new Error('Insufficient BTC. Need at least 20,000 sats for transfer.');
      }
      
      // Create transfer PSBT using builder
      const psbtBase64 = await createTransferPSBTSimple(
        btcWalletAddress,
        btcDepositAddress,
        runeId,
        transferAmount,
        1,
        unisatApiKey,
        "mainnet"
      );
      
      console.log('✍️ Requesting signature...');
      
      // Sign with Unisat
      const signedPsbt = await unisat.signPsbt(psbtBase64, {
        autoFinalized: true,
      });
      
      console.log('📡 Broadcasting...');
      
      // Broadcast
      const txid = await unisat.pushPsbt(signedPsbt);
      */

      // Use Unisat's native sendRunes API
      const txid = await unisat.sendRunes(
        btcDepositAddress,           // toAddress
        runeId,                  // runeId  
        transferAmount.toString(),    // amount (as string, human-readable)
        {
          feeRate: 1 // optional fee rate
        }
      );
    
      
      console.log('✅ Transfer successful! TXID:', txid);
      await generateTicket(txid, runeId, transferAmount);

      successMessage = `🎉 Import successful!\n\n` +
        `Rune ID: ${runeId}\n` +
        `Amount: ${importAmount}\n` +
        `To: ${btcDepositAddress.slice(0, 12)}...${btcDepositAddress.slice(-8)}\n` +
        `TXID: ${txid}\n\n` +
        `Mempool: https://mempool.space/mainnet/tx/${txid}\n` +
        `Omnity: https://explorer.omnity.network/ticket/${txid}`;
      
      // Reset form
      importAmount = 0;
    } catch (error) {
      console.log('Import failed:', error);
      errorMessage = `❌ Import failed: ${error}`;
    } finally {
      isImporting = false;
    }
  }

  async function handleGenerateTicket() {
    const txid = '012516a45814ca6525f7ab2e782b8126f9bb80c0dbbeb683217912a53856d0d4';
    const amount = BigInt(importAmount) * BigInt(100_000);
    await generateTicket(txid, runeId, amount);
  }

  async function generateTicket(txid: string, runeId: string, amount: bigint) {
    const result = await bitcoinStore.generateTicket(
      txid,
      receiverPrincipalId,
      amount,
      runeId
    );

    console.log('🎟️ Ticket generated:', result);
  }

  async function handleExport() {
    if (!btcWalletAddress) {
      alert('Please connect BTC wallet to export runes');
      return;
    }
    
    if (!exportAmount || Number(exportAmount) <= 0) {
      alert('Please enter a valid exporting amount');
      return;
    }

    // find runes info from store
    const runeToken =bitcoinStore.query.data?.find(token => token.rune_id === runeId);
    if (!runeToken) {
      alert(`Rune token with ID ${runeId} not found in store.`);
      return;
    }
    console.log("Exporting rune token:", $state.snapshot(runeToken));

    try {
      isExporting = true;
      const amount = BigInt(exportAmount) * BigInt(100_000); // Convert to sats
      const ticketId =  await bitcoinStore.exportRunes(
        btcWalletAddress,
        runeToken.token_id,
        amount,
        REDEEM_FEE,
      );
      successMessage = `🎉 Export successful! Ticket ID: ${ticketId}`;
      exportAmount = 0;
    } catch (error) {
      errorMessage = `❌ Export failed: ${error}`;
    } finally {
      isExporting = false;
    }
  }

  function getUnisat() {
    if (typeof window.unisat !== 'undefined') {
      return window.unisat;
    }
    throw new Error('Unisat wallet not found.');
  }
  
  async function connect() {
    try {
      const unisat = getUnisat();
      const accounts = await unisat.requestAccounts();
      btcWalletAddress = accounts[0];
      isConnected = true;
    } catch (error) {
      console.error('Connection failed:', error);
    }
  }

  function disconnect() {
    btcWalletAddress = '';
    isConnected = false;
  }
</script>

<!-- mock UI -->
<!--
<div>
  <h1>Bitcoin Rune Dispenser</h1>
  {#if successMessage}
    <div style="border: 1px solid green; padding: 10px; margin: 10px 0; white-space: pre-wrap;">
      {successMessage}
    </div>
  {/if}
  {#if errorMessage}
    <div style="border: 1px solid red; padding: 10px; margin: 10px 0; white-space: pre-wrap;">
      {errorMessage}
    </div>
  {/if}

  {#if !isConnected}
    <button onclick={connect} style="border: 1px solid #ccc; margin-top: 10px;">Connect Unisat Wallet</button>
  {:else}
    <p>Connected BTC Address: {btcWalletAddress}</p>
    <button onclick={disconnect} style="border: 1px solid #ccc; margin-top: 10px;">Disconnect Wallet</button>
  {/if}

  <div>
    <h2>Import Runes</h2>
    {#if runeBalanceInfos.length > 0}
      <div>
        <h3>Your Runes:</h3>
        <select style="border: 1px solid #ccc;">
          {#each runeBalanceInfos as rune (rune.runeid)}
            <option value={rune.runeid}>
              {rune.symbol} (Rune ID: {rune.runeid}) - Amount: {rune.balance}
            </option>
          {/each}
        </select>
        <p>Amount:</p>
        <input bind:value={importAmount} type="number" min="0" style="border: 1px solid #ccc;" />
      </div>
      <div>
        <button onclick={handleImport} style="border: 1px solid #ccc; margin-top: 10px;">Import Runes</button>
      </div>
      <div>
        <button onclick={handleGenerateTicket} style="border: 1px solid #ccc; margin-top: 10px;">Generate ticket</button>
      </div>
    {:else}
      <p>No runes found in your wallet.</p>
    {/if}
  </div>

  <div>
    <h2>Export Runes</h2>
    <p>PrincipalID: {receiverPrincipalId}</p>
    <p>Bitcoin Deposit Address: {btcDepositAddress}</p>
    <p>Wrapped Runes Balance: {wrappedRunesBalance}</p>
    <p>Amount:</p>
    <input bind:value={exportAmount} type="number" min="0" style="border: 1px solid #ccc;" />
    <div>
      <button onclick={handleExport} style="border: 1px solid #ccc; margin-top: 10px;">Export Runes</button>
    </div>
  </div>
</div>
-->

<!-- beautiful version -->
<div class="container">
  <div class="header">
    <h1>⚡ Bitcoin Rune Dispenser</h1>
    <p class="subtitle">Seamlessly import and export your Bitcoin Runes</p>
  </div>

  {#if successMessage}
    <div class="alert alert-success">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>{successMessage}</span>
    </div>
  {/if}

  {#if errorMessage}
    <div class="alert alert-error">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
      <span>{errorMessage}</span>
    </div>
  {/if}

  <div class="card wallet-card">
    <div class="card-header">
      <h2>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
        Wallet Connection
      </h2>
    </div>
    <div class="card-body">
      <div class="info-grid">
        <div class="info-item">
          <label>Principal ID:</label>
          <code class="value">{receiverPrincipalId}</code>
        </div>
        <div class="info-item">
          <label>Deposit Address:</label>
          <code class="value">{btcDepositAddress}</code>
        </div>
      </div>
      {#if !isConnected}
        <div class="connect-state">
          <p class="info-text">Connect your Unisat wallet to get started</p>
          <button class="btn btn-primary" onclick={connect}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            Connect Unisat Wallet
          </button>
        </div>
      {:else}
        <div class="connected-state">
          <div class="wallet-info">
            <div class="status-badge">
              <span class="status-dot"></span>
              Connected
            </div>
            <div class="address-display">
              <label>Bitcoin Address:</label>
              <code class="address">{btcWalletAddress}</code>
            </div>
          </div>
          <button class="btn btn-secondary" onclick={disconnect}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Disconnect
          </button>
        </div>
      {/if}
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <h2>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <polyline points="19 12 12 19 5 12"></polyline>
        </svg>
        Import Runes
      </h2>
      <p class="card-description">Transfer runes from your Bitcoin wallet to the platform</p>
    </div>
    <div class="card-body">
    {#if !isConnected}
        <p class="info-text">Please connect your Bitcoin wallet to import runes.</p>
    {:else}
      {#if runeBalanceInfos.length > 0}
        <div class="form-group">
          <label for="rune-select">Select Rune:</label>
          <select id="rune-select" class="input-field">
            {#each runeBalanceInfos as rune (rune.runeid)}
              <option value={rune.runeid}>
                {rune.symbol} Balance: {parseFloat(rune.balance.toFixed(3))} (ID: {rune.runeid})
              </option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="import-amount">Amount to Import:</label>
          <input 
            id="import-amount"
            bind:value={importAmount} 
            type="number" 
            min="0" 
            placeholder="Enter amount"
            class="input-field"
          />
        </div>

        <div class="button-group">
          <button class="btn btn-primary" onclick={handleImport}>
            {#if isImporting}
              <svg class="spinner" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"  fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
              </svg>
                Importing...
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="16 16 12 12 8 16"></polyline>
                <line x1="12" y1="12" x2="12" y2="21"></line>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
              </svg>
              Import Runes
            {/if}
          </button>
          <!-- <button class="btn btn-outline" onclick={handleGenerateTicket}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Generate Ticket
          </button> -->
        </div>
      {:else}
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p>No runes found in your wallet</p>
        </div>
      {/if}
    {/if}
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <h2>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="19" x2="12" y2="5"></line>
          <polyline points="5 12 12 5 19 12"></polyline>
        </svg>
        Export Runes
      </h2>
      <p class="card-description">Withdraw wrapped runes back to your Bitcoin wallet</p>
    </div>
    <div class="card-body">
      <div class="info-grid">
        <div class="info-item">
          <label>Wrapped Balance:</label>
          <code class="value balance-highlight">{parseFloat(wrappedRunesBalance.toFixed(3))} 🐕</code>
        </div>
      </div>

      <div class="form-group">
        <label for="export-amount">Amount to Export:</label>
        <input 
          id="export-amount"
          bind:value={exportAmount} 
          type="number" 
          min="0" 
          placeholder="Enter amount"
          class="input-field"
        />
      </div>

      <button class="btn btn-primary btn-full" onclick={handleExport}>
        {#if isExporting}
          <svg class="spinner" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"  fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
          </svg>
            Exporting...
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="8 17 12 21 16 17"></polyline>
            <line x1="12" y1="12" x2="12" y2="21"></line>
            <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
          </svg>
            Export Runes
        {/if}
      </button>
    </div>
  </div>
</div>

<style>
  :root {
    --primary: #f7931a;
    --primary-dark: #e08516;
    --secondary: #4a5568;
    --success: #10b981;
    --error: #ef4444;
    --bg-primary: #ffffff;
    --bg-secondary: #f8fafc;
    --border: #e2e8f0;
    --text-primary: #1e293b;
    --text-secondary: #64748b;
    --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  }

  .container {
    max-width: 900px;
    margin: 2rem auto;
    padding: 0 1rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }

  .header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, #f7931a 0%, #e08516 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    color: var(--text-secondary);
    font-size: 1.1rem;
    margin: 0;
  }

  /* Alert Styles */
  .alert {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .alert svg {
    flex-shrink: 0;
  }

  .alert-success {
    background-color: #d1fae5;
    color: #065f46;
    border: 1px solid #10b981;
  }

  .alert-error {
    background-color: #fee2e2;
    color: #991b1b;
    border: 1px solid #ef4444;
  }

  /* Card Styles */
  .card {
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    box-shadow: var(--shadow);
    margin-bottom: 1.5rem;
    overflow: hidden;
  }

  .card-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg-secondary);
  }

  .card-header h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .card-description {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .card-body {
    padding: 1.5rem;
  }

  /* Wallet Card Specific */
  .wallet-card .card-body {
    padding: 2rem 1.5rem;
  }

  .connect-state {
    text-align: center;
  }

  .info-text {
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
  }

  .connected-state {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .wallet-info {
    flex: 1;
    min-width: 200px;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: #d1fae5;
    color: #065f46;
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.75rem;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    background: #10b981;
    border-radius: 50%;
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .address-display label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 0.25rem;
  }

  .address {
    display: block;
    padding: 0.5rem 0.75rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 0.375rem;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    word-break: break-all;
    color: var(--text-primary);
  }

  /* Form Styles */
  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group label {
    display: block;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
    font-size: 0.95rem;
  }

  .input-field {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    font-size: 1rem;
    transition: all 0.2s;
    background: white;
    color: var(--text-primary);
  }

  .input-field:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(247, 147, 26, 0.1);
  }

  .input-field::placeholder {
    color: var(--text-secondary);
  }

  /* Button Styles */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 500;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    text-decoration: none;
  }

  .btn-primary {
    background: var(--primary);
    color: white;
  }

  .btn-primary:hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
    box-shadow: var(--shadow-lg);
  }

  .btn-secondary {
    background: var(--secondary);
    color: white;
  }

  .btn-secondary:hover {
    background: #3a4556;
    transform: translateY(-1px);
  }

  .btn-outline {
    background: white;
    color: var(--text-primary);
    border: 1px solid var(--border);
  }

  .btn-outline:hover {
    background: var(--bg-secondary);
    border-color: var(--primary);
    color: var(--primary);
  }

  .btn-full {
    width: 100%;
  }

  .button-group {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .button-group .btn {
    flex: 1;
    min-width: 150px;
  }

  /* Info Grid */
  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .info-item {
    padding: 1rem;
    background: var(--bg-secondary);
    border-radius: 0.5rem;
    border: 1px solid var(--border);
  }

  .info-item label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
  }

  .info-item .value {
    display: block;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    color: var(--text-primary);
    word-break: break-all;
  }

  .balance-highlight {
    font-size: 1.25rem !important;
    font-weight: 600;
    color: var(--primary);
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-secondary);
  }

  .empty-state svg {
    color: var(--border);
    margin-bottom: 1rem;
  }

  .empty-state p {
    margin: 0.5rem 0;
    font-weight: 500;
    color: var(--text-primary);
  }

  .empty-state small {
    font-size: 0.875rem;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .header h1 {
      font-size: 2rem;
    }

    .connected-state {
      flex-direction: column;
      align-items: stretch;
    }

    .button-group {
      flex-direction: column;
    }

    .button-group .btn {
      width: 100%;
    }

    .info-grid {
      grid-template-columns: 1fr;
    }
  }
</style>