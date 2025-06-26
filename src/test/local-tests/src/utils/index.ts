export const safeParseJSON = (arg: Record<string, unknown | undefined>): string => {
    return JSON.stringify(arg, (key, value) =>
        typeof value === "bigint" ? value.toString() : value,
    );
};

export type Response<T, E> =
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

export const parseResultResponse = <T, E>(response: Response<T, E>): T => {
    if ("ok" in response) {
        return response.ok;
    } else if ("Ok" in response) {
        for (const key in response.Ok) {
            if (
                (Array.isArray(response.Ok[key]) && response.Ok[key].length === 0) ||
                !response.Ok[key]
            ) {
                delete response.Ok[key];
            }
        }
        return response.Ok;
    } else if ("err" in response) {
        throw new Error(safeParseJSON(response.err as Record<string, unknown>));
    } else if ("Err" in response) {
        throw new Error(safeParseJSON(response.Err as Record<string, unknown>));
    }

    throw new Error("Invalid response");
};
