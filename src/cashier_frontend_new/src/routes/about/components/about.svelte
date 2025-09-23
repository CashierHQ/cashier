<!-- DEMO: this component is needed only by the about page, so it is declared here instead of the global scope -->

<script lang="ts">
  import { resolve } from '$app/paths';

  // DEMO: component properties are type checked at compile time
  // You can make them optional if you want by make them nullable
  interface AboutProps {
		name: string;
		version: number;
        description: string;
	}

	let { name, version, description }: AboutProps = $props();

</script>


<div class="hero bg-base-200 min-h-screen">
  <div class="hero-content text-center">
    <div class="max-w-md">
      <h1 class="text-5xl font-bold">About</h1>
      <p>
        Project name <code>{name}</code>, version <code>{version}</code>, is {description}.
      </p>
      <p class="py-6"><a class="link" href={resolve("/")}>home</a></p>
    </div>
  </div>
</div>