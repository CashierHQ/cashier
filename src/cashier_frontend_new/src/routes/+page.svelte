<script lang="ts">
  // DEMO: `resolve` is a helper function that statically checks link validity at compile time
  import { resolve } from '$app/paths';
  import { THE_ANSWER } from '$lib/constants';
// DEMO: `m` is a helper function that statically checks message validity at compile time
	import { m } from '$lib/paraglide/messages.js';

  console.log("The answer is: " + THE_ANSWER);
</script>

<!-- DEMO: no need for a dedicated tailwind configuration because this uses version 4 by default -->
<div class="hero bg-base-200 min-h-screen">
  <div class="hero-content text-center">
    <div class="max-w-md">

      <!-- DEMO: a message is statically checked and, if possible, resolved at compile time -->
      <h1 class="text-5xl font-bold">{m.welcome()}</h1>

      <!-- DEMO: a link to a page, the linked is statically checked at compile time. So all links are always correct -->
      <p class="py-6">Blog: <a class="link" href={resolve('/blog/blog_title')}>Blog</a></p>
      
      <p class="py-6"><a class="link" href={resolve('/about')}>About</a></p>

      <p class="py-6"><a class="link" href={resolve('/token')}>Token</a></p>
    </div>
  </div>
</div>