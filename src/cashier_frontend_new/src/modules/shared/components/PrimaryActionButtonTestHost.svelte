<script lang="ts">
  import PrimaryActionButton from "$modules/shared/components/PrimaryActionButton.svelte";
  import type { ButtonVariant } from "$lib/shadcn/components/ui/button/button.svelte";

  const {
    label,
    disabled = false,
    loading = false,
    loadingLabel,
    tone = "primary",
    variant = "default",
    onClick = () => {},
  }: {
    label: string;
    disabled?: boolean;
    loading?: boolean;
    loadingLabel?: string;
    tone?: "primary" | "destructive";
    variant?: ButtonVariant;
    onClick?: () => void;
  } = $props();
</script>

<PrimaryActionButton
  type="button"
  {tone}
  {variant}
  {disabled}
  {loading}
  {loadingLabel}
  onclick={onClick}
>
  {label}
</PrimaryActionButton>
