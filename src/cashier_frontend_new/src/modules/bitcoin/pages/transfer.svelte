<script lang="ts">
  import { createTransferPSBT, type UTXO } from '$modules/bitcoin/utils/pbst-builder';
  
  let address = $state('');
  let isConnected = $state(false);
  let isTransferring = $state(false);
  
  // Transfer form data
  let recipientAddress = $state('');
  let transferAmount = $state('');
  let runeBlock = $state('2584333');
  let runeTx = $state('39');
  
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
  
  async function transferRune() {
    if (!recipientAddress) {
      alert('Please enter recipient address');
      return;
    }
    
    if (!transferAmount || Number(transferAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    isTransferring = true;
    
    try {
      const unisat = getUnisat();
      
      const runeId = `${runeBlock}:${runeTx}`;
      console.log('📤 Transferring Rune ID:', runeId);
      console.log('📤 To:', recipientAddress);
      console.log('📤 Amount:', transferAmount);
      
      // Get UTXOs
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
      const psbtBase64 = await createTransferPSBT({
        utxos: [selectedUtxo],
        fromAddress: address,
        toAddress: recipientAddress,
        runeId: {
          block: BigInt(runeBlock),
          tx: Number(runeTx)
        },
        amount: BigInt(transferAmount),
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
      
      console.log('✅ Transfer successful! TXID:', txid);
      
      alert(
        `🎉 Runes transferred successfully!\n\n` +
        `Rune ID: ${runeId}\n` +
        `Amount: ${transferAmount}\n` +
        `To: ${recipientAddress.slice(0, 12)}...${recipientAddress.slice(-8)}\n` +
        `TXID: ${txid}\n\n` +
        `View: https://mempool.space/testnet/tx/${txid}`
      );
      
      // Reset form
      recipientAddress = '';
      transferAmount = '';
      
    } catch (error) {
      console.error('❌ Transfer failed:', error);
      alert(`Transfer failed: ${error.message}`);
    } finally {
      isTransferring = false;
    }
  }
  
  function disconnect() {
    address = '';
    isConnected = false;
  }
</script>

<div class="container">
  {#if !isConnected}
    <div class="connect-section">
      <h1>📤 Transfer Runes</h1>
      <p>Connect your wallet to transfer runes</p>
      <button class="btn-primary" onclick={connect}>
        Connect Unisat Wallet
      </button>
    </div>
  {:else}
    <div class="transfer-form">
      <div class="wallet-info">
        <h3>💼 Wallet</h3>
        <p><strong>Address:</strong> {address.slice(0, 12)}...{address.slice(-8)}</p>
        <button class="btn-secondary" onclick={disconnect}>Disconnect</button>
      </div>

      <div class="form-section">
        <h2>📤 Transfer Runes</h2>
        
        <div class="form-group">
          <label for="runeId">Rune ID</label>
          <div class="rune-id-inputs">
            <input 
              id="runeBlock"
              type="text" 
              bind:value={runeBlock} 
              placeholder="Block"
              disabled={isTransferring}
            />
            <span class="separator">:</span>
            <input 
              id="runeTx"
              type="text" 
              bind:value={runeTx} 
              placeholder="TX"
              disabled={isTransferring}
            />
          </div>
          <small>Format: BLOCK:TX (e.g., 2584333:39)</small>
        </div>

        <div class="form-group">
          <label for="recipient">Recipient Address <span class="required">*</span></label>
          <input 
            id="recipient"
            type="text" 
            bind:value={recipientAddress} 
            placeholder="tb1q..."
            disabled={isTransferring}
          />
          <small>Bitcoin testnet address</small>
        </div>

        <div class="form-group">
          <label for="amount">Amount <span class="required">*</span></label>
          <input 
            id="amount"
            type="text" 
            bind:value={transferAmount} 
            placeholder="1000"
            disabled={isTransferring}
          />
          <small>Number of runes to transfer</small>
        </div>

        <button 
          class="btn-transfer" 
          onclick={transferRune} 
          disabled={isTransferring || !recipientAddress || !transferAmount}
        >
          {isTransferring ? '⏳ Transferring...' : '📤 Transfer Runes'}
        </button>

        <div class="info-box">
          <h4>📋 Important Notes:</h4>
          <ul>
            <li>Make sure you have enough runes in your wallet</li>
            <li>Recipient will receive runes + 546 sats (dust)</li>
            <li>Transaction fee: ~3,000-5,000 sats</li>
            <li>Runes will appear after indexer processes the transaction</li>
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

  .transfer-form {
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

  .btn-transfer {
    width: 100%;
    padding: 16px;
    background: #28a745;
    color: white;
    margin-top: 10px;
  }

  .btn-transfer:hover:not(:disabled) {
    background: #218838;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
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