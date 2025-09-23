<script lang="ts">
	import { page } from '$app/state';
    import { m } from '$lib/paraglide/messages.js';
    import { resolve } from '$app/paths';

    let slug = page.params.slug || 'empty';

</script>

<h1>{m.blog_title({ title: slug })}</h1>

<p class="py-6"><a class="link" href={resolve(`/blog/[slug]`, {
	slug: slug + "_1"
})}>another blog</a></p>
<p class="py-6"><a class="link" href={resolve("/")}>home</a></p>