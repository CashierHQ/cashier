<script lang="ts">
  import ProtectedIP from "$modules/guard/components/ProtectedIP.svelte";
</script>

<ProtectedIP>
  <div data-testid="child">Child content</div>
</ProtectedIP>
