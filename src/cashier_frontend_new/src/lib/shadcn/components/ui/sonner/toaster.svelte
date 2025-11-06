<script lang="ts">
  import { Toaster } from "svelte-sonner";

  type ToasterProps = {
    position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
    expand?: boolean;
    richColors?: boolean;
  };

  let {
    position = "top-center",
    expand = true,
    richColors = true,
  }: ToasterProps = $props();
</script>

<Toaster
  {position}
  {expand}
  {richColors}
  toastOptions={{
    classNames: {
      toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
      description: "group-[.toast]:text-muted-foreground",
      actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
      cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
    },
  }}
/>

