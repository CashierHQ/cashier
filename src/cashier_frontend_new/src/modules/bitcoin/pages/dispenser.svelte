<script lang="ts">
  import { authState } from '$modules/auth/state/auth.svelte';

  let receiveAddress: string = $derived.by(() => {
      return authState.account?.owner || "No principal";
  });
</script>

<div>
  PrincipalID: {receiveAddress}
</div>