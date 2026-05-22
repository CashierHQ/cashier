<script lang="ts">
  import ProtectedValidLink from "$modules/guard/components/ProtectedValidLink.svelte";

  let { redirectTo }: { redirectTo?: string } = $props();
</script>

<ProtectedValidLink {redirectTo}>
  <div data-testid="child">Child content</div>
</ProtectedValidLink>
