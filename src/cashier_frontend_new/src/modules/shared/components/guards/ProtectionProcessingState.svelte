<script lang="ts">
  let {
    message = "Loading...",
  }: {
    message?: string;
  } = $props();
</script>

<div class="flex items-center justify-center p-8">
  {message}
</div>

