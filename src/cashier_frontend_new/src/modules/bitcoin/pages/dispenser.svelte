<script lang="ts">
  import { authState } from '$modules/auth/state/auth.svelte';
  import { createTransferPSBT, type UTXO } from '$modules/bitcoin/utils/pbst-builder';
  import { bitcoinStore } from '../bitcoinStore.svelte';

  let btcWalletAddress = $state('');
  let isConnected = $state(false);
  let isTransferring = $state(false);
  let importAmount = $state(0);
  let successMessage = $state('');
  let errorMessage = $state('');

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

  async function handleImport() {
    if (!btcDepositAddress) {
      alert('Please enter recipient address');
      return;
    }
    
    if (!importAmount || Number(importAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    isTransferring = true;
    
    try {
      const unisat = getUnisat();
      
      const runeBlock = '840000';
      const runeTx = '3';
      const runeId = `${runeBlock}:${runeTx}`; // DOG TO THE MOON
      
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
        fromAddress: btcWalletAddress,
        toAddress: btcDepositAddress,
        runeId: {
          block: BigInt(runeBlock),
          tx: Number(runeTx)
        },
        amount: BigInt(importAmount),
        feeRate: 10,
        network: 'mainnet'
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

      successMessage = `🎉 Runes transferred successfully!\n\n` +
        `Rune ID: ${runeId}\n` +
        `Amount: ${importAmount}\n` +
        `To: ${btcDepositAddress.slice(0, 12)}...${btcDepositAddress.slice(-8)}\n` +
        `TXID: ${txid}\n\n` +
        `View: https://mempool.space/mainnet/tx/${txid}`
      
      // Reset form
      importAmount = 0;
      
    } catch (error) {
      console.error('❌ Transfer failed:', error);
      errorMessage = `❌ Transfer failed: ${error}`;
    } finally {
      isTransferring = false;
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
</script>

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
  <p>PrincipalID: {receiverPrincipalId}</p>
  <p>Bitcoin Deposit Address: {btcDepositAddress}</p>
  {#if !isConnected}
    <button onclick={connect} style="border: 1px solid #ccc;">Connect Unisat Wallet</button>
  {:else}
    <p>Connected BTC Address: {btcWalletAddress}</p>
    <button onclick={disconnect} style="border: 1px solid #ccc;">Disconnect Wallet</button>
  {/if}
  {#if bitcoinStore.query.data}
  <div>
    <p>Select runes to import</p>
    <select style="border: 1px solid #ccc;">
      {#each bitcoinStore.query.data as token (token.token_id)}
        <option value={token.token_id}>
          {token.symbol} ({token.token_id} - Rune ID: {token.rune_id})
        </option>
      {/each}
    </select>
    <p>Amount:</p>
    <input bind:value={importAmount} type="number" min="0" style="border: 1px solid #ccc;" />
  </div>
    <button onclick={handleImport} style="border: 1px solid #ccc;">Import Runes</button>
  {/if}
</div>