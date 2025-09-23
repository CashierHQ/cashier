<script lang="ts" >
    interface Props {
		name: string;
		version: number;
        description: string;
	}

	let { name, version, description }: Props = $props();

</script>

<p>
	Project name <code>{name}</code>, version <code>{version}</code>is {description}.
</p>
