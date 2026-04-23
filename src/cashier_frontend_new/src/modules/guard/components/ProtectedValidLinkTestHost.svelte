<script lang="ts">
  import ProtectedValidLink from "./ProtectedValidLink.svelte";

  let { redirectTo }: { redirectTo?: string } = $props();
</script>

<ProtectedValidLink {redirectTo}>
  <div data-testid="child">Child content</div>
</ProtectedValidLink>
