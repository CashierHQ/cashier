<script lang="ts">
  import { createMintPSBT, type UTXO } from '$modules/bitcoin/utils/pbst-builder';
  
  let address = $state('');
  let isConnected = $state(false);
  let isMinting = $state(false);
  
  // Mint form data
  let runeBlock = $state('2584333');
  let runeTx = $state('39');
  let runeName = $state(''); // Optional display name
  
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
      address = accounts[0];
      isConnected = true;
    } catch (error) {
      console.error('Connection failed:', error);
      alert(error.message);
    }
  }
  
  async function getUTXOs(): Promise<UTXO[]> {
    const unisat = getUnisat();
    const utxos = await unisat.getBitcoinUtxos();
    
    return utxos.map((utxo: any) => ({
      txid: utxo.txid,
      vout: utxo.vout,
      value: utxo.satoshis || utxo.value,
      scriptPubKey: utxo.scriptPk
    }));
  }
  
  async function mintRune() {
    isMinting = true;
    
    try {
      const unisat = getUnisat();
      
      const runeId = `${runeBlock}:${runeTx}`;
      console.log('🪙 Minting Rune ID:', runeId);
      
      // Get UTXOs
      const utxos = await getUTXOs();
      
      if (utxos.length === 0) {
        throw new Error('No UTXOs available. You need testnet BTC.');
      }
      
      // Select UTXO with enough value
      const selectedUtxo = utxos.find(u => u.value > 10000) || utxos[0];
      
      if (selectedUtxo.value < 10000) {
        throw new Error('Insufficient BTC. Need at least 10,000 sats for minting.');
      }
      
      // Create mint PSBT using builder
      const psbtBase64 = await createMintPSBT({
        utxos: [selectedUtxo],
        address: address,
        runeId: {
          block: BigInt(runeBlock),
          tx: Number(runeTx)
        },
        feeRate: 10,
        network: 'testnet'
      });
      
      console.log('✍️ Requesting signature...');
      
      // Sign with Unisat
      const signedPsbt = await unisat.signPsbt(psbtBase64, {
        autoFinalized: true,
      });
      
      console.log('📡 Broadcasting...');
      
      // Broadcast
      const txid = await unisat.pushPsbt(signedPsbt);
      
      console.log('✅ Mint successful! TXID:', txid);
      
      alert(
        `🎉 Rune minted successfully!\n\n` +
        `Rune ID: ${runeId}\n` +
        `TXID: ${txid}\n\n` +
        `View: https://mempool.space/testnet/tx/${txid}`
      );
      
    } catch (error) {
      console.error('❌ Minting failed:', error);
      alert(`Minting failed: ${error.message}`);
    } finally {
      isMinting = false;
    }
  }
  
  function disconnect() {
    address = '';
    isConnected = false;
  }
  
  // Quick preset runes
  function setPresetRune(name: string, block: string, tx: string) {
    runeName = name;
    runeBlock = block;
    runeTx = tx;
  }
</script>

<div class="container">
  {#if !isConnected}
    <div class="connect-section">
      <h1>🪙 Mint Runes</h1>
      <p>Connect your wallet to mint runes</p>
      <button class="btn-primary" onclick={connect}>
        Connect Unisat Wallet
      </button>
    </div>
  {:else}
    <div class="mint-form">
      <div class="wallet-info">
        <h3>💼 Wallet</h3>
        <p><strong>Address:</strong> {address.slice(0, 12)}...{address.slice(-8)}</p>
        <button class="btn-secondary" onclick={disconnect}>Disconnect</button>
      </div>

      <div class="form-section">
        <h2>🪙 Mint a Rune</h2>
        
        <div class="preset-section">
          <h3>Quick Mint (Popular Testnet Runes)</h3>
          <div class="preset-buttons">
            <button 
              class="btn-preset"
              onclick={() => setPresetRune('I•NEED•TEST•RUNES', '2584333', '39')}
              disabled={isMinting}
            >
              I•NEED•TEST•RUNES
            </button>
            <button 
              class="btn-preset"
              onclick={() => setPresetRune('TEST•RUNE', '2584333', '39')}
              disabled={isMinting}
            >
              Custom Rune
            </button>
          </div>
          <p class="preset-note">
            Find more mintable runes at: 
            <a href="https://testnet.unisat.io/runes" target="_blank">testnet.unisat.io/runes</a>
          </p>
        </div>

        <div class="divider">
          <span>OR ENTER MANUALLY</span>
        </div>

        <div class="form-group">
          <label for="runeName">Rune Name (optional)</label>
          <input 
            id="runeName"
            type="text" 
            bind:value={runeName} 
            placeholder="I•NEED•TEST•RUNES"
            disabled={isMinting}
          />
          <small>Display name for the rune</small>
        </div>

        <div class="form-group">
          <label for="runeId">Rune ID <span class="required">*</span></label>
          <div class="rune-id-inputs">
            <input 
              id="runeBlock"
              type="text" 
              bind:value={runeBlock} 
              placeholder="Block"
              disabled={isMinting}
            />
            <span class="separator">:</span>
            <input 
              id="runeTx"
              type="text" 
              bind:value={runeTx} 
              placeholder="TX"
              disabled={isMinting}
            />
          </div>
          <small>Format: BLOCK:TX (e.g., 2584333:39)</small>
        </div>

        <button 
          class="btn-mint" 
          onclick={mintRune} 
          disabled={isMinting || !runeBlock || !runeTx}
        >
          {isMinting ? '⏳ Minting...' : '🪙 Mint Rune'}
        </button>

        <div class="info-box">
          <h4>📋 Important Notes:</h4>
          <ul>
            <li>Minting requires 10,000+ sats for transaction fees</li>
            <li>Each mint claims the amount specified in the rune's terms</li>
            <li>Check if the rune still has available mints (cap not reached)</li>
            <li>Minted runes appear after indexer processes (~15-30 min)</li>
            <li>Only mintable runes can be minted (check terms on explorer)</li>
          </ul>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 600px;
    margin: 50px auto;
    padding: 30px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .connect-section {
    text-align: center;
    padding: 60px 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .connect-section h1 {
    font-size: 2.5em;
    margin-bottom: 10px;
  }

  .connect-section p {
    color: #666;
    margin-bottom: 30px;
  }

  .mint-form {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .wallet-info {
    padding: 20px;
    background: #f8f9fa;
    border-bottom: 1px solid #e0e0e0;
  }

  .wallet-info h3 {
    margin-top: 0;
    margin-bottom: 10px;
  }

  .wallet-info p {
    margin: 10px 0;
    color: #333;
  }

  .form-section {
    padding: 30px;
  }

  .form-section h2 {
    margin-top: 0;
    margin-bottom: 25px;
    color: #333;
  }

  .preset-section {
    padding: 20px;
    background: #e8f5e9;
    border-radius: 8px;
    margin-bottom: 25px;
  }

  .preset-section h3 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #2e7d32;
    font-size: 16px;
  }

  .preset-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 15px;
  }

  .btn-preset {
    padding: 12px 16px;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.2s;
  }

  .btn-preset:hover:not(:disabled) {
    background: #45a049;
    transform: translateY(-1px);
  }

  .btn-preset:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .preset-note {
    margin: 0;
    font-size: 13px;
    color: #2e7d32;
  }

  .preset-note a {
    color: #1976d2;
    text-decoration: none;
  }

  .preset-note a:hover {
    text-decoration: underline;
  }

  .divider {
    text-align: center;
    margin: 25px 0;
    position: relative;
  }

  .divider::before,
  .divider::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 40%;
    height: 1px;
    background: #e0e0e0;
  }

  .divider::before {
    left: 0;
  }

  .divider::after {
    right: 0;
  }

  .divider span {
    background: white;
    padding: 0 15px;
    color: #999;
    font-size: 13px;
    font-weight: 600;
  }

  .form-group {
    margin-bottom: 25px;
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

  .form-group input {
    width: 100%;
    padding: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 16px;
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
    font-size: 13px;
  }

  .rune-id-inputs {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .rune-id-inputs input {
    flex: 1;
  }

  .separator {
    font-size: 20px;
    font-weight: bold;
    color: #666;
  }

  button {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    width: 100%;
    padding: 15px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
    padding: 8px 16px;
    font-size: 14px;
  }

  .btn-secondary:hover {
    background: #5a6268;
  }

  .btn-mint {
    width: 100%;
    padding: 16px;
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
    margin-top: 10px;
  }

  .btn-mint:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
  }

  button:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }

  .info-box {
    margin-top: 30px;
    padding: 20px;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 8px;
  }

  .info-box h4 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #856404;
  }

  .info-box ul {
    margin: 0;
    padding-left: 20px;
  }

  .info-box li {
    margin-bottom: 8px;
    color: #856404;
    line-height: 1.5;
  }
</style>