import { Err, Ok, type Result } from "ts-results-es";
import * as devalue from "devalue";

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
): Result<T, Error> => {
  if ("ok" in response) {
    return Ok(response.ok);
  } else if ("Ok" in response) {
    // for (const key in response.Ok) {
    //     if (
    //         (Array.isArray(response.Ok[key]) && response.Ok[key].length === 0) ||
    //         !response.Ok[key]
    //     ) {
    //         delete response.Ok[key];
    //     }
    // }
    return Ok(response.Ok);
  } else if ("err" in response) {
    return Err(new Error(devalue.stringify(response.err)));
  } else if ("Err" in response) {
    return Err(new Error(devalue.stringify(response.Err)));
  }

  return Err(new Error("Invalid response"));
};
