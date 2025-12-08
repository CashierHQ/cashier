<script lang="ts">
  import { createEtchingPSBT, type UTXO } from '$modules/bitcoin/utils/pbst-builder';
  import type { RuneEtchingParams } from '$modules/bitcoin/utils/runestone-helper';
  import { onMount } from 'svelte';
  
  let address = $state('');
  let publicKey = $state('');
  let balance = $state(0);
  let isConnected = $state(false);
  let network = $state<'mainnet' | 'testnet'>('testnet');
  let isEtching = $state(false);

  // Rune etching form data
  let runeName = $state('');
  let runeSymbol = $state('');
  let divisibility = $state(0);
  let premine = $state('');
  let amount = $state('');
  let cap = $state('');
  let turbo = $state(true);
  let feeRate = $state(50); // Higher fee for testnet

  // Advanced terms
  let useAdvancedTerms = $state(false);
  let heightStart = $state<number>();
  let heightEnd = $state<number>();
  let offsetStart = $state<number>();
  let offsetEnd = $state<number>();

  function getUnisat() {
    if (typeof window.unisat !== 'undefined') {
      return window.unisat;
    }
    throw new Error('Unisat wallet not found. Please install it.');
  }

  async function connect() {
    try {
      const unisat = getUnisat();
      const accounts = await unisat.requestAccounts();
      address = accounts[0];
      publicKey = await unisat.getPublicKey();
      isConnected = true;
      
      const balanceData = await unisat.getBalance();
      balance = balanceData.confirmed + balanceData.unconfirmed;
      
      const networkType = await unisat.getNetwork();
      network = networkType === 'livenet' ? 'mainnet' : 'testnet';
      
      console.log('✅ Connected:', { address, publicKey, balance, network });
    } catch (error) {
      console.error('Connection failed:', error);
      alert(error.message);
    }
  }

  function disconnect() {
    address = '';
    publicKey = '';
    balance = 0;
    isConnected = false;
  }

  async function getUTXOs(): Promise<UTXO[]> {
    try {
      const unisat = getUnisat();
      
      const utxos = await unisat.getBitcoinUtxos();
      
      console.log('📦 Fetched UTXOs:', utxos);
      
      // Transform to our UTXO format
      const transformed = utxos.map((utxo: any) => ({
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.satoshis || utxo.value,
        scriptPubKey: utxo.scriptPk
      }));

      console.log('📦 Transformed UTXOs:', transformed);
      
      return transformed;
    } catch (error) {
      console.error('Failed to get UTXOs:', error);
      throw error;
    }
  }

  async function etchRune() {
    if (!runeName || runeName.length < 13) {
      alert('⚠️ Rune name must be at least 13 characters for current block height');
      return;
    }

    isEtching = true;

    try {
      const unisat = getUnisat();
      
      console.log('🚀 Starting rune etching process...');
      
      // Step 1: Prepare etching parameters
      const etchingParams: RuneEtchingParams = {
        runeName: runeName.toUpperCase(),
        symbol: runeSymbol || undefined,
        divisibility: divisibility || 0,
        premine: premine || undefined,
        terms: (amount || cap || heightStart || heightEnd || offsetStart || offsetEnd) ? {
          amount: amount || undefined,
          cap: cap || undefined,
          heightStart: heightStart,
          heightEnd: heightEnd,
          offsetStart: offsetStart,
          offsetEnd: offsetEnd,
        } : undefined,
        turbo: turbo
      };
      
      console.log('📝 Etching parameters:', etchingParams);
      
      // Step 2: Get UTXOs
      console.log('📦 Fetching UTXOs...');
      const utxos = await getUTXOs();
      
      if (utxos.length === 0) {
        throw new Error('No UTXOs available. You need BTC to etch a rune.');
      }
      
      // Select UTXOs with enough balance
      // For now, use the largest UTXO
      const sortedUtxos = utxos.sort((a, b) => b.value - a.value);
      const selectedUtxos = [sortedUtxos[0]];
      
      console.log('✅ Selected UTXOs:', selectedUtxos);
      console.log(`💰 Total input: ${selectedUtxos[0].value} sats`);
      
      // Step 3: Create PSBT
      console.log('🔨 Creating PSBT...');
      const psbtBase64 = await createEtchingPSBT({
        utxos: selectedUtxos,
        address: address,
        etchingParams: etchingParams,
        feeRate: feeRate,
        network: network
      });
      
      console.log('✅ PSBT created (base64):', psbtBase64.substring(0, 100) + '...');
      
      // Step 4: Sign PSBT with Unisat
      console.log('✍️ Requesting signature from Unisat...');
      const signedPsbt = await unisat.signPsbt(psbtBase64, {
        autoFinalized: true
      });
      
      console.log('✅ PSBT signed:', signedPsbt.substring(0, 100) + '...');
      
      // Step 5: Broadcast transaction
      console.log('📡 Broadcasting transaction...');
      const txid = await unisat.pushPsbt(signedPsbt);
      
      console.log('✅ Transaction broadcast! TXID:', txid);
      
      const explorerUrl = network === 'testnet' 
        ? `https://mempool.space/testnet/tx/${txid}`
        : `https://mempool.space/tx/${txid}`;
      
      alert(
        `🎉 Rune etched successfully!\n\n` +
        `Rune Name: ${runeName.toUpperCase()}\n` +
        `TXID: ${txid}\n\n` +
        `View on explorer:\n${explorerUrl}`
      );
      
      // Reset form
      runeName = '';
      runeSymbol = '';
      premine = '';
      amount = '';
      cap = '';
      heightStart = undefined;
      heightEnd = undefined;
      offsetStart = undefined;
      offsetEnd = undefined;
      
    } catch (error) {
      console.error('❌ Etching failed:', error);
      alert(`❌ Etching failed:\n\n${error.message}`);
    } finally {
      isEtching = false;
    }
  }

  async function switchNetwork(newNetwork: 'mainnet' | 'testnet') {
    try {
      const unisat = getUnisat();
      await unisat.switchNetwork(newNetwork === 'mainnet' ? 'livenet' : 'testnet');
      network = newNetwork;
      
      // Refresh balance
      const balanceData = await unisat.getBalance();
      balance = balanceData.confirmed + balanceData.unconfirmed;
    } catch (error) {
      console.error('Failed to switch network:', error);
      alert(`Failed to switch network: ${error.message}`);
    }
  }

  onMount(() => {
    if (typeof window.unisat !== 'undefined') {
      window.unisat.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          address = accounts[0];
        } else {
          disconnect();
        }
      });

      window.unisat.on('networkChanged', (newNetwork) => {
        network = newNetwork === 'livenet' ? 'mainnet' : 'testnet';
      });
    }
  });
</script>

<div class="wallet-container">
  {#if !isConnected}
    <div class="connect-section">
      <h1>🪙 Rune Etcher</h1>
      <p>Connect your Unisat wallet to etch a new Rune</p>
      <button class="connect-btn" onclick={connect}>
        Connect Unisat Wallet
      </button>
    </div>
  {:else}
    <div class="wallet-info">
      <h3>💼 Wallet Info</h3>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">Address:</span>
          <span class="value">{address.slice(0, 12)}...{address.slice(-8)}</span>
        </div>
        <div class="info-item">
          <span class="label">Balance:</span>
          <span class="value">{(balance / 100000000).toFixed(8)} BTC</span>
        </div>
        <div class="info-item">
          <span class="label">Network:</span>
          <span class="value network-badge" class:testnet={network === 'testnet'}>
            {network}
          </span>
        </div>
      </div>
      
      <div class="button-group">
        <button onclick={disconnect}>Disconnect</button>
        <button 
          onclick={() => switchNetwork('testnet')} 
          disabled={network === 'testnet'}
        >
          Switch to Testnet
        </button>
        <button 
          onclick={() => switchNetwork('mainnet')} 
          disabled={network === 'mainnet'}
        >
          Switch to Mainnet
        </button>
      </div>
    </div>

    <div class="etch-form">
      <h2>🔨 Etch a New Rune</h2>
      
      {#if network === 'mainnet'}
        <div class="warning-box">
          ⚠️ <strong>WARNING:</strong> You are on MAINNET! This will use real BTC.
          Switch to testnet for testing.
        </div>
      {:else}
        <div class="info-box">
          ℹ️ You are on testnet. Get testnet BTC from a faucet first.
        </div>
      {/if}
      
      <div class="form-section">
        <h3>Basic Info</h3>
        
        <div class="form-group">
          <label for="runeName">
            Rune Name <span class="required">*</span>
          </label>
          <input 
            id="runeName"
            type="text" 
            bind:value={runeName} 
            placeholder="UNCOMMON•GOODS"
            disabled={isEtching}
          />
          <small>
            Uppercase A-Z and • spacer. Current length: {runeName.length}/13 minimum
          </small>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="runeSymbol">Symbol</label>
            <input 
              id="runeSymbol"
              type="text" 
              bind:value={runeSymbol} 
              placeholder="¤"
              maxlength="1"
              disabled={isEtching}
            />
          </div>

          <div class="form-group">
            <label for="divisibility">Divisibility</label>
            <input 
              id="divisibility"
              type="number" 
              bind:value={divisibility} 
              min="0" 
              max="38"
              disabled={isEtching}
            />
          </div>
        </div>

        <div class="form-group">
          <label for="premine">Premine Amount</label>
          <input 
            id="premine"
            type="text" 
            bind:value={premine} 
            placeholder="0"
            disabled={isEtching}
          />
          <small>Amount minted immediately to your address</small>
        </div>
      </div>

      <div class="form-section">
        <h3>Public Minting Terms</h3>

        <div class="form-row">
          <div class="form-group">
            <label for="amount">Amount per Mint</label>
            <input 
              id="amount"
              type="text" 
              bind:value={amount} 
              placeholder="1000"
              disabled={isEtching}
            />
          </div>

          <div class="form-group">
            <label for="cap">Cap (Max Mints)</label>
            <input 
              id="cap"
              type="text" 
              bind:value={cap} 
              placeholder="21000000"
              disabled={isEtching}
            />
          </div>
        </div>

        <div class="form-group">
          <label>
            <input 
              type="checkbox" 
              bind:checked={useAdvancedTerms}
              disabled={isEtching}
            />
            Use Advanced Terms (height/offset constraints)
          </label>
        </div>

        {#if useAdvancedTerms}
          <div class="advanced-terms">
            <h4>Height Constraints</h4>
            <div class="form-row">
              <div class="form-group">
                <label for="heightStart">Start Block</label>
                <input 
                  id="heightStart"
                  type="number" 
                  bind:value={heightStart} 
                  placeholder="Optional"
                  disabled={isEtching}
                />
              </div>
              <div class="form-group">
                <label for="heightEnd">End Block</label>
                <input 
                  id="heightEnd"
                  type="number" 
                  bind:value={heightEnd} 
                  placeholder="Optional"
                  disabled={isEtching}
                />
              </div>
            </div>

            <h4>Offset Constraints</h4>
            <div class="form-row">
              <div class="form-group">
                <label for="offsetStart">Start Offset</label>
                <input 
                  id="offsetStart"
                  type="number" 
                  bind:value={offsetStart} 
                  placeholder="Optional"
                  disabled={isEtching}
                />
              </div>
              <div class="form-group">
                <label for="offsetEnd">End Offset</label>
                <input 
                  id="offsetEnd"
                  type="number" 
                  bind:value={offsetEnd} 
                  placeholder="Optional"
                  disabled={isEtching}
                />
              </div>
            </div>
          </div>
        {/if}
      </div>

      <div class="form-section">
        <h3>Transaction Settings</h3>

        <div class="form-row">
          <div class="form-group">
            <label for="feeRate">Fee Rate (sat/vB)</label>
            <input 
              id="feeRate"
              type="number" 
              bind:value={feeRate} 
              min="1"
              disabled={isEtching}
            />
            <small>Higher = faster confirmation. Testnet: 10-50, Mainnet: check mempool</small>
          </div>

          <div class="form-group">
            <label>
              <input 
                type="checkbox" 
                bind:checked={turbo}
                disabled={isEtching}
              />
              Turbo Mode
            </label>
            <small>Enables faster minting</small>
          </div>
        </div>
      </div>

      <button 
        class="etch-button"
        onclick={etchRune} 
        disabled={!runeName || runeName.length < 13 || isEtching}
      >
        {#if isEtching}
          ⏳ Etching...
        {:else}
          🚀 Etch Rune
        {/if}
      </button>

      <div class="info-box">
        <h4>📋 Requirements:</h4>
        <ul>
          <li>Minimum 13 characters for rune name (current block height)</li>
          <li>Estimated fee: ~{(feeRate * 300 / 100000000).toFixed(8)} BTC</li>
          <li>Rune name must be unique (not already etched)</li>
          <li>Use • (bullet) as spacer between words</li>
        </ul>
      </div>
    </div>
  {/if}
</div>

<style>
  .wallet-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .connect-section {
    text-align: center;
    padding: 60px 20px;
  }

  .connect-section h1 {
    font-size: 2.5em;
    margin-bottom: 10px;
  }

  .connect-btn {
    padding: 15px 40px;
    font-size: 18px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    margin-top: 20px;
  }

  .connect-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  .wallet-info {
    margin: 20px 0;
    padding: 25px;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    border-radius: 12px;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin: 20px 0;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .label {
    font-size: 12px;
    text-transform: uppercase;
    color: #666;
    font-weight: 600;
  }

  .value {
    font-size: 14px;
    font-weight: 500;
    color: #333;
  }

  .network-badge {
    display: inline-block;
    padding: 4px 12px;
    background: #28a745;
    color: white;
    border-radius: 4px;
    text-transform: uppercase;
    font-size: 12px;
  }

  .network-badge.testnet {
    background: #ffc107;
    color: #333;
  }

  .etch-form {
    background: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .form-section {
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 1px solid #e0e0e0;
  }

  .form-section:last-of-type {
    border-bottom: none;
  }

  .form-section h3 {
    margin-top: 0;
    margin-bottom: 20px;
    color: #333;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #333;
  }

  .required {
    color: #dc3545;
  }

  .form-group input[type="text"],
  .form-group input[type="number"] {
    width: 100%;
    padding: 10px 12px;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    font-size: 14px;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }

  .form-group input:focus {
    outline: none;
    border-color: #667eea;
  }

  .form-group input:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }

  .form-group small {
    display: block;
    margin-top: 6px;
    color: #666;
    font-size: 12px;
  }

  .advanced-terms {
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
    margin-top: 15px;
  }

  .advanced-terms h4 {
    margin-top: 15px;
    margin-bottom: 10px;
    font-size: 14px;
    color: #666;
    text-transform: uppercase;
  }

  .button-group {
    display: flex;
    gap: 10px;
    margin-top: 15px;
    flex-wrap: wrap;
  }

  button {
    padding: 10px 20px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.2s;
  }

  button:hover:not(:disabled) {
    background: #5568d3;
    transform: translateY(-1px);
  }

  button:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }

  .etch-button {
    width: 100%;
    padding: 16px;
    font-size: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    margin-top: 20px;
  }

  .warning-box {
    padding: 15px;
    background: #fff3cd;
    border: 2px solid #ffc107;
    border-radius: 8px;
    margin-bottom: 20px;
    color: #856404;
  }

  .info-box {
    padding: 15px;
    background: #d1ecf1;
    border: 1px solid #bee5eb;
    border-radius: 8px;
    margin-top: 20px;
  }

  .info-box h4 {
    margin-top: 0;
    color: #0c5460;
  }

  .info-box ul {
    margin-bottom: 0;
    padding-left: 20px;
  }

  .info-box li {
    margin-bottom: 8px;
    color: #0c5460;
  }
</style>