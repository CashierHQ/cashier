<script lang="ts">
  import RouteGuard from "$modules/guard/components/RouteGuard.svelte";
  import ProtectedAuth from "$modules/guard/components/ProtectedAuth.svelte";
  import AppHeader from "$modules/shared/components/AppHeader.svelte";
  import ManageTokensPage from "$modules/wallet/pages/manage.svelte";
</script>

<RouteGuard>
  <ProtectedAuth>
    <div class="flex flex-col min-h-screen sm:bg-lightgreen bg-white">
      <AppHeader class="max-sm:hidden" />

      <div
        class="flex-1 sm:py-4 pb-2 flex items-center justify-center flex-col"
      >
        <div
          class="w-full flex-1 flex flex-col sm:max-w-[600px] max-w-full sm:p-8 px-0 grow-1 bg-white sm:rounded-xl overflow-hidden"
        >
          <div
            class="sm:max-h-[calc(100vh-156px)] max-h-[calc(100vh-78px)] flex flex-col grow-1 overflow-y-auto scrollbar-hide"
          >
            <ManageTokensPage />
          </div>
        </div>
      </div>
    </div>
  </ProtectedAuth>
</RouteGuard>
