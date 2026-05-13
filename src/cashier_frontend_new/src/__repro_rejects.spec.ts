import { describe, it, expect } from "vitest";

describe("rejects.toThrow repro", () => {
  it("baseline: sync throw with string matcher works", () => {
    expect(() => {
      throw new Error("Hello world");
    }).toThrow("Hello world");
  });

  it("baseline: sync throw with regex matcher works", () => {
    expect(() => {
      throw new Error("Hello world");
    }).toThrow(/Hello/);
  });

  it("rejects with string matcher", async () => {
    await expect(Promise.reject(new Error("Hello world"))).rejects.toThrow(
      "Hello world",
    );
  });

  it("rejects with regex matcher", async () => {
    await expect(Promise.reject(new Error("Hello world"))).rejects.toThrow(
      /Hello/,
    );
  });

  it("rejects with no matcher", async () => {
    await expect(Promise.reject(new Error("Hello world"))).rejects.toThrow();
  });

  it("rejects with Error class matcher", async () => {
    await expect(Promise.reject(new Error("Hello world"))).rejects.toThrow(
      Error,
    );
  });

  it("rejects with toThrowError + string", async () => {
    await expect(
      Promise.reject(new Error("Hello world")),
    ).rejects.toThrowError("Hello world");
  });

  it("rejects checking message via property", async () => {
    await expect(
      Promise.reject(new Error("Hello world")),
    ).rejects.toHaveProperty("message", "Hello world");
  });

  it("rejects checking message via toMatchObject", async () => {
    await expect(
      Promise.reject(new Error("Hello world")),
    ).rejects.toMatchObject({ message: "Hello world" });
  });
});
