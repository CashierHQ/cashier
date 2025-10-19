<script lang="ts">
  import { page } from "$app/state";
  import Detail from "$modules/links/components/detail.svelte";
  const id = page.params.id;
</script>

<section>
  {#if id}
  <div class="w-1/3">
    <Detail {id} />
  </div>
  {/if}
</section>
