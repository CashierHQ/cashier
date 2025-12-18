<script lang="ts">
  import RouteGuard from "$modules/guard/components/RouteGuard.svelte";
  import ProtectedAuth from "$modules/guard/components/ProtectedAuth.svelte";
  import AppHeader from "$modules/shared/components/AppHeader.svelte";
  import TokenInfoPage from "$modules/wallet/pages/tokenInfo.svelte";
</script>

<RouteGuard>
  <ProtectedAuth>
    <div class="flex flex-col min-h-screen sm:bg-lightgreen bg-white">
      <AppHeader class="max-sm:hidden" />

      <div
        class="flex-1 sm:py-4 pb-2 flex items-center justify-center flex-col"
      >
        <div
          class="w-full sm:max-w-[600px] max-w-full sm:p-8 px-0 grow-1 bg-white sm:rounded-xl overflow-hidden"
        >
          <div
            class="sm:max-h-[calc(100vh-156px)] max-h-[calc(100vh-12px)] overflow-y-auto scrollbar-hide"
          >
            <TokenInfoPage />
          </div>
        </div>
      </div>
    </div>
  </ProtectedAuth>
</RouteGuard>
