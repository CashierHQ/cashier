<script lang="ts">
  import { locale } from "$lib/i18n";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { type BitcoinBlock } from "$modules/bitcoin/types/bitcoin_transaction";

  type Props = {
    confirmations: BitcoinBlock[];
    minConfirmations: number;
  };

  let { confirmations, minConfirmations }: Props = $props();
  const confirmationSlots = $derived(
    Array.from({ length: minConfirmations }, (_, index) => ({
      index,
      confirmation: confirmations[index] ?? null,
    })),
  );
</script>

<div class="input-label-field-container">
  <div class="flex flex-col w-full gap-2">
    <div class="flex items-center gap-2">
      <Label class="font-medium text-base">
        {locale
          .t("bitcoin.txCart.confirmationsRequired")
          .replace("{{minConfirmations}}", minConfirmations.toString())}
      </Label>
    </div>

    <div
      class="border-[1px] rounded-lg border-lightgreen px-4 py-3 flex flex-col gap-4 max-h-[150px] overflow-y-auto"
    >
      {#each confirmationSlots as slot (slot.index)}
        <div class="flex justify-between items-start">
          <div class="flex items-center gap-3">
            {#if slot.confirmation}
              <svg
                class="w-5 h-5 text-green-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clip-rule="evenodd"
                />
              </svg>
            {:else}
              <div class="w-5 h-5 flex items-center justify-center">
                <div class="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
              </div>
            {/if}
            <p class="text-base font-medium text-gray-700">
              {locale.t("bitcoin.txCart.confirmation")} #{slot.index + 1}
            </p>
          </div>

          <div class="flex flex-col items-end">
            {#if slot.confirmation}
              <p class="text-base font-medium">
                {new Date(
                  Number(slot.confirmation.block_timestamp) * 1000,
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p class="text-sm text-gray-400">
                {new Date(
                  Number(slot.confirmation.block_timestamp) * 1000,
                ).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </p>
            {:else}
              <p class="text-base text-gray-400">-</p>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
