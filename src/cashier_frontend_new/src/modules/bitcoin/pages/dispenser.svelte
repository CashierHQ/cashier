<script lang="ts">
  import { authState } from '$modules/auth/state/auth.svelte';
  import { bitcoinStore } from '../bitcoinStore.svelte';
  import { REDEEM_FEE } from '../constants';
  import type { AvailableUTXO, RuneBalanceInfo, UTXOWithRunes } from '../types';

  let btcWalletAddress = $state('');
  let isConnected = $state(false);
  let isTransferring = $state(false);
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
        console.log('Rune balance infos:', runeBalanceInfos);
      });
    }
  })

  let wrappedRunesBalance = $state<Number>(0);
  $effect(() => {
    if (receiverPrincipalId) {
      bitcoinStore.getWrappedRunesBalance().then((balance) => {
        wrappedRunesBalance = Number(balance) / 100_000; // Convert from sats to Runes
        console.log('Wrapped runes balance:', wrappedRunesBalance);
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
    
    isTransferring = true;
    
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

      successMessage = `🎉 Ticket generated successfully!\n\n` +
        `Rune ID: ${runeId}\n` +
        `Amount: ${importAmount}\n` +
        `To: ${btcDepositAddress.slice(0, 12)}...${btcDepositAddress.slice(-8)}\n` +
        `TXID: ${txid}\n\n` +
        `Mempool: https://mempool.space/mainnet/tx/${txid}\n` +
        `Omnity: https://explorer.omnity.network/ticket/${txid}`;
      
      // Reset form
      importAmount = 0;
    } catch (error) {
      errorMessage = `❌ Transfer failed: ${error}`;
    } finally {
      isTransferring = false;
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
      const amount = BigInt(exportAmount) * BigInt(100_000); // Convert to sats
      const ticketId =  await bitcoinStore.exportRunes(
        btcWalletAddress,
        runeToken.token_id,
        amount,
        REDEEM_FEE,
      );
      successMessage = `🎉 Export successful! Ticket ID: ${ticketId}`;
    } catch (error) {
      errorMessage = `❌ Export failed: ${error}`;
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

  async function getUTXOsWithRunes(): Promise<UTXOWithRunes[]> {
    if (!btcWalletAddress) {
      throw new Error('Wallet not connected.');
    }
    
    const utxosWithRunes = await bitcoinStore.getUTXOsWithRunes(
      btcWalletAddress,
      unisatApiKey,
      'mainnet'
    );
    console.log('UTXOs with runes:', utxosWithRunes);
    return utxosWithRunes;
  }

  async function getAvailableUTXOs(): Promise<AvailableUTXO[]> {
    if (!btcWalletAddress) {
      throw new Error('Wallet not connected.');
    }
    
    const availableUtxos = await bitcoinStore.getAvailableUTXOs(
      btcWalletAddress,
      unisatApiKey,
      'mainnet',
    );
    console.log('Available UTXOs:', availableUtxos);
    return availableUtxos;
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

  {#if !isConnected}
    <button onclick={connect} style="border: 1px solid #ccc; margin-top: 10px;">Connect Unisat Wallet</button>
  {:else}
    <p>Connected BTC Address: {btcWalletAddress}</p>
    <button onclick={disconnect} style="border: 1px solid #ccc; margin-top: 10px;">Disconnect Wallet</button>
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
  {/if}

  <div>
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