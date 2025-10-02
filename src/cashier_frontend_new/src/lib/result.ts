import { Err, Ok, type Result } from "ts-results-es";
import { rsMatch } from "./rsMatch";

type Response<T, E> =
  | {
      ok: T;
    }
  | {
      err: E;
    }
  | {
      Ok: T;
    }
  | {
      Err: E;
    };

/**
 * Converts a response from a canister call to a Result object.
 *
 * @param response - The response to be converted
 * @returns The result object
 */
export const responseToResult = <T, E>(
  response: Response<T, E>,
): Result<T, E> => {
  return rsMatch(response, {
    Ok: (val) => Ok(val),
    ok: (val) => Ok(val),
    Err: (val) => Err(val),
    err: (val) => Err(val),
  });
};

/**
 * Calls a callback and returns a Result object.
 * If the callback throws an error, it will be caught and returned as Err.
 *
 * @param callback - The callback to be called
 * @returns The result object
 */
export const catchError = <T>(callback: () => T): Result<T, unknown> => {
  try {
    return Ok(callback());
  } catch (error) {
    return Err(error);
  }
};
