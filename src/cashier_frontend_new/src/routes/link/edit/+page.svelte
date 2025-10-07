<script lang="ts">
  // Thin wrapper: import the module page component so the /link/edit route
  // stays available while the implementation lives under
  // src/modules/links/page/+page.svelte
  import EditLink from "$modules/links/page/edit.svelte";
</script>

<EditLink />
