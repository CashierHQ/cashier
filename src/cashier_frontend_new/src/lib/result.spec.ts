import { describe, expect, it } from "vitest";
import { catchError, responseToResult } from "./result";
import { Ok } from "ts-results-es";
import * as devalue from "devalue";

describe.only("Result", () => {
  it("should convert a Response.ok to a Result", () => {
    // Arrange
    const response: { ok: string } = {
      ok: "ok",
    };

    // Act
    const result = responseToResult(response);

    // Assert
    expect(result).toEqual(Ok("ok"));
  });

  it("should convert a Response.err to a Result", () => {
    // Arrange
    const response: { err: string } = {
      err: "error_message",
    };

    // Act
    const result = responseToResult(response);

    // Assert
    expect(result.unwrapErr()).toEqual(
      new Error(devalue.stringify("error_message")),
    );
  });

  it("should convert a Response.Ok to a Result", () => {
    // Arrange
    const response: { Ok: string } = {
      Ok: "Ok",
    };

    // Act
    const result = responseToResult(response);

    // Assert
    expect(result).toEqual(Ok("Ok"));
  });

  it("should convert a Response.Err to a Result", () => {
    // Arrange
    const response: { Err: string } = {
      Err: "ErrorMessage",
    };

    // Act
    const result = responseToResult(response);

    // Assert
    expect(result.unwrapErr()).toEqual(
      new Error(devalue.stringify("ErrorMessage")),
    );
  });

  it("should catch a valid response", () => {
    const result = catchError(() => {
      return "everything is ok";
    });

    // Assert
    expect(result).toEqual(Ok("everything is ok"));
  });

  it("should catch an error", () => {
    const result = catchError(() => {
      throw new Error("something went wrong");
    });
    // Assert
    expect(result.unwrapErr()).toEqual(new Error("something went wrong"));
  });
});
