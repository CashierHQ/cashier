<script lang="ts">
  import About from './components/about.svelte';

  let name = 'Cashier';
  let version = 0.1;
  let description = 'new frontend based on sveltekit';

</script>

<!-- DEMO: component properties are type checked at compile time -->
<About {name} {version} {description} />