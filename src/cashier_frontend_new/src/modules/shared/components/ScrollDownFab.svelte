<script lang="ts">
  import { ArrowDown } from "lucide-svelte";
  import { onDestroy, onMount, tick } from "svelte";

  const {
    root,
    ariaLabel,
  }: {
    root?: HTMLElement;
    ariaLabel: string;
  } = $props();

  let scrollParent: HTMLElement | Window | null = null;
  let showButton = $state(false);
  let resizeObserver: ResizeObserver | null = null;
  let mutationObserver: MutationObserver | null = null;

  function isWindowScrollParent(
    parent: HTMLElement | Window,
  ): parent is Window {
    return parent === window;
  }

  function getScrollParent(element: HTMLElement): HTMLElement | Window {
    let parent = element.parentElement;

    while (parent) {
      const overflowY = getComputedStyle(parent).overflowY;

      if (overflowY === "auto" || overflowY === "scroll") {
        return parent;
      }

      parent = parent.parentElement;
    }

    return window;
  }

  function getScrollMetrics(parent: HTMLElement | Window) {
    if (isWindowScrollParent(parent)) {
      const scrollingElement =
        document.scrollingElement ?? document.documentElement;

      return {
        scrollTop: window.scrollY,
        scrollHeight: scrollingElement.scrollHeight,
        clientHeight: window.innerHeight,
      };
    }

    return {
      scrollTop: parent.scrollTop,
      scrollHeight: parent.scrollHeight,
      clientHeight: parent.clientHeight,
    };
  }

  function updateButtonVisibility() {
    if (!scrollParent) {
      showButton = false;
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } =
      getScrollMetrics(scrollParent);
    showButton = scrollTop + clientHeight < scrollHeight - 8;
  }

  function scrollDown() {
    if (!scrollParent) return;

    const scrollOptions: ScrollToOptions = {
      top: getScrollMetrics(scrollParent).scrollTop + 320,
      behavior: "smooth",
    };

    if (isWindowScrollParent(scrollParent)) {
      window.scrollTo(scrollOptions);
      return;
    }

    scrollParent.scrollTo(scrollOptions);
  }

  async function initializeScrollParent() {
    await tick();

    if (!root) return;

    scrollParent = getScrollParent(root);
    scrollParent.addEventListener("scroll", updateButtonVisibility, {
      passive: true,
    });
    window.addEventListener("resize", updateButtonVisibility);

    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(updateButtonVisibility);
      resizeObserver.observe(root);

      if (!isWindowScrollParent(scrollParent)) {
        resizeObserver.observe(scrollParent);
      }
    }

    if ("MutationObserver" in window) {
      mutationObserver = new MutationObserver(updateButtonVisibility);
      mutationObserver.observe(root, {
        attributes: true,
        childList: true,
        subtree: true,
      });
    }

    updateButtonVisibility();
  }

  onMount(() => {
    initializeScrollParent();
  });

  onDestroy(() => {
    scrollParent?.removeEventListener("scroll", updateButtonVisibility);
    window.removeEventListener("resize", updateButtonVisibility);
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
  });
</script>

{#if showButton}
  <button
    type="button"
    class="fixed bottom-[86px] right-[30px] z-30 flex h-[3rem] w-[3rem] cursor-pointer items-center justify-center rounded-full border-2 border-white bg-green text-white shadow-lg transition-colors hover:bg-green/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    aria-label={ariaLabel}
    onclick={scrollDown}
  >
    <ArrowDown class="h-6 w-6" stroke-width="3" />
  </button>
{/if}
