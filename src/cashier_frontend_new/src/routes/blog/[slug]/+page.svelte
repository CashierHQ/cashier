<script lang="ts">
  import { page } from "$app/state";
  import { m } from "$lib/paraglide/messages.js";
  import { resolve } from "$app/paths";

  let slug = page.params.slug || "empty";
</script>

<!-- DEMO: a message is statically checked, in addition, if the message contains a parameter, the parameter is statically checked too like the `title` here -->
<h1>{m.blog_title({ title: slug })}</h1>

<!-- DEMO: link validity is statically checked even in case of dynamic parameters like the slug here -->
<p class="py-6">
  <a
    class="link"
    href={resolve(`/blog/[slug]`, {
      slug: slug + "_1",
    })}>another blog</a
  >
</p>

<p class="py-6"><a class="link" href={resolve("/")}>home</a></p>
