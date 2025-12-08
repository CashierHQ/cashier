<script lang="ts">
  import { createMintPSBT, type UTXO } from '$modules/bitcoin/utils/pbst-builder';
  
  let address = $state('');
  let isConnected = $state(false);
  let isMinting = $state(false);
  
  // Rune ID to mint
  const RUNE_ID = {
    block: 2584333n,
    tx: 39
  };
  
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
      
      console.log('🪙 Minting Rune ID: 2584333:39');
      
      // Get UTXOs
      const utxos = await getUTXOs();
      
      if (utxos.length === 0) {
        throw new Error('No UTXOs available. You need testnet BTC.');
      }
      
      // Select UTXO with enough value
      const selectedUtxo = utxos.find(u => u.value > 10000) || utxos[0];
      
      // Create mint PSBT using builder
      const psbtBase64 = await createMintPSBT({
        utxos: [selectedUtxo],
        address: address,
        runeId: RUNE_ID,
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
        `Rune ID: 2584333:39\n` +
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
</script>

<div class="container">
  {#if !isConnected}
    <button onclick={connect}>Connect Wallet</button>
  {:else}
    <div>
      <p>Address: {address.slice(0, 12)}...{address.slice(-8)}</p>
      <button onclick={mintRune} disabled={isMinting}>
        {isMinting ? '⏳ Minting...' : '🪙 Mint Rune 2584333:39'}
      </button>
    </div>
  {/if}
</div>