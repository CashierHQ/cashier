<script lang="ts">
  interface Props {
    name: string;
    version: number;
    description: string;
  }

  let data: Props = $props();
</script>

<p>
  Project name <code>{data.name}</code>, version <code>{data.version}</code>is {data.description}.
</p>
