<script lang="ts">
  import { resolve } from "$app/paths";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { paths } from "$modules/routing/paths";
  import CashierLogo from "$modules/ui/components/CashierLogo.svelte";
</script>

<main class="flex min-h-screen flex-col bg-lightgreen">
  <header class="w-full bg-background px-4 py-4 sm:px-6 lg:px-8">
    <CashierLogo href={resolve(paths.home())} />
  </header>

  <section class="flex flex-1 items-center justify-center px-4 py-10">
    <div class="w-full max-w-xl rounded-2xl bg-white px-6 py-12 text-center shadow-sm sm:px-10">
      <p class="text-sm font-semibold uppercase tracking-wide text-primary">404</p>
      <h1 class="mt-3 text-3xl font-bold text-gray-950 sm:text-4xl">Page not found</h1>
      <p class="mx-auto mt-4 max-w-sm text-base text-muted-foreground">
        The page you are looking for does not exist or is no longer available.
      </p>
      <Button href={resolve(paths.home())} class="mt-8 w-full max-w-xs rounded-full">
        Go Home
      </Button>
    </div>
  </section>
</main>
