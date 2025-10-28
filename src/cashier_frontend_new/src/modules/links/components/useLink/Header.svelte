<script lang="ts">
  interface Props {
    title: string;
  }

  let { title }: Props = $props();
</script>

<div class="flex items-center gap-3 mb-4">
  <h3 class="text-lg font-semibold flex-1 text-center">{title}</h3>
</div>
