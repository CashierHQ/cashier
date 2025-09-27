/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, test, vi } from "vitest";
import { dataState } from "./dataStore.svelte";


beforeEach(() => localStorage.clear())

describe("Build data should be injected by vite at build time", () => {

    it('uses initial value if nothing in local storage', async () => {
      vi.useFakeTimers();

      const store = dataState<number>({
        queryFn: () => new Promise((resolve) => {
          console.log("resolved");
          resolve(426)
      }),
        // persistedKey: ['test']
      });

      await Promise.resolve();
      //  vi.runAllTicks();
          // await vi.runAllTimersAsync();
          // vi.advanceTimersToNextFrame();
          // vi.advanceTimersToNextFrame();
          // vi.advanceTimersToNextFrame();
          // vi.advanceTimersToNextFrame();
      // expect(store.isLoading).toEqual(false);
    //   store.data;
    //   store.data;
      console.log("data: " + store.data);
    expect(store.data).toEqual(426);
  })
});
