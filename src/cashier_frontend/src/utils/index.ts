export const safeParseJSON = (arg: Record<string, unknown>): any => {
    return JSON.stringify(
        arg,
        (key, value) => (typeof value === "bigint" ? value.toString() : value),
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
            if (Array.isArray(response.Ok[key]) && response.Ok[key].length === 0) {
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

export const resizeImage = (file: Blob): Promise<Blob> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                if (img.width <= 500 && img.height <= 500)
                    return resolve(file);
                const elem = document.createElement("canvas");
                if (img.width > img.height) {
                    elem.width = 500;
                    elem.height = (500 * img.height) / img.width;
                } else {
                    elem.width = (500 * img.width) / img.height;
                    elem.height = 500;
                }
                const ctx = elem.getContext("2d");
                ctx?.drawImage(img, 0, 0, elem.width, elem.height);
                ctx?.canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    }
                });
            };
        };
    });
}

export const fileToBase64 = (file: Blob) => {
    return new Promise<string>((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(file);
        fileReader.onload = () => {
            resolve(fileReader?.result as string);
        };
        fileReader.onerror = (error) => {
            reject(error);
        };
    });
};