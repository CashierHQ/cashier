<script lang="ts">
	import { page } from '$app/state';
    import { m } from '$lib/paraglide/messages.js';

    let slug = page.params.slug || 'empty';

</script>

<h1>{m.blog_title({ title: slug })}</h1>

<p class="py-6"><a class="link" href="/blog/{slug}1">another blog</a></p>
<p class="py-6"><a class="link" href="/">home</a></p>