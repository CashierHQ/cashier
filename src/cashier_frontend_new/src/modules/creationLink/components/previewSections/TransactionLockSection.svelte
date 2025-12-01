<script lang="ts">
  import { locale } from "$lib/i18n";

  type Props = {
    transactionLockStatus: string;
  };

  let { transactionLockStatus }: Props = $props();
</script>

<div class="flex flex-row items-center justify-between border-lightgreen border-[1px] rounded-lg px-5 py-3">
  <p class="font-medium text-sm">{locale.t("links.linkForm.preview.transactionLock")}</p>
  <p class="text-sm">{transactionLockStatus}</p>
</div>

