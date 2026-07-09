<script lang="ts">
  import PrimaryActionButton from "$modules/shared/components/PrimaryActionButton.svelte";
  import type { ButtonVariant } from "$lib/shadcn/components/ui/button/button.svelte";

  const {
    label,
    disabled = false,
    tone = "primary",
    variant = "default",
    onClick = () => {},
  }: {
    label: string;
    disabled?: boolean;
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
  onclick={onClick}
>
  {label}
</PrimaryActionButton>
