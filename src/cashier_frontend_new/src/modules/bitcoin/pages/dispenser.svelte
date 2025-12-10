<script lang="ts">
  import { authState } from '$modules/auth/state/auth.svelte';
  import { type UTXO } from '$modules/bitcoin/utils/pbst-builder';
  import { bitcoinStore } from '../bitcoinStore.svelte';

  let btcWalletAddress = $state('');
  let isConnected = $state(false);

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
    console.log("Importing runes for", receiverPrincipalId, "to BTC address", btcDepositAddress);
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
    <input type="number" min="0" style="border: 1px solid #ccc;" />
  </div>
    <button onclick={handleImport} style="border: 1px solid #ccc;">Import Runes</button>
  {/if}
</div>