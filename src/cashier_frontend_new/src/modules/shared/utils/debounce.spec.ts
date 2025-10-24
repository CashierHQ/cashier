import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import debounce from "./debounce";

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("calls the function after the wait time", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced("a");
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("a");
  });

  it("uses the last arguments when called multiple times", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);

    debounced(1);
    debounced(2);
    debounced(3);

    vi.advanceTimersByTime(49);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);
  });

  it("preserves `this` binding when invoking", () => {
    const ctx = { x: 42 };
    const fn = vi.fn(function (this: { x: number }) {
      // access `this` to ensure binding is forwarded
      return this.x;
    });

    const debounced = debounce(fn, 20);

    // call with explicit this using .call
    debounced.call(ctx);

    vi.advanceTimersByTime(20);
    expect(fn).toHaveBeenCalledTimes(1);
    // ensure the mock was called with the correct `this`
    expect(fn.mock.instances[0]).toBe(ctx);
  });

  it("postpones calls when invoked repeatedly (last call wins)", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 30);

    debounced("x");
    debounced("y");

    vi.advanceTimersByTime(29);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("y");
  });
});
