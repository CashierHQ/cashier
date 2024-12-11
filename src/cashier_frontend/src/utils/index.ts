import { MediaQuery } from "@/hooks/responsive-hook";
import { UIResponsiveType } from "@/pages/edit/[id]/index_responsive";
import { LinkDetailModel } from "@/services/types/link.service.types";

export const safeParseJSON = (arg: Record<string, unknown>): string => {
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

export const resizeImage = (file: Blob): Promise<Blob> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                if (img.width <= 500 && img.height <= 500) return resolve(file);
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
};

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

export const convertNanoSecondsToDate = (nanoSeconds: bigint): Date => {
    let result = new Date();
    try {
        const parseValue = Number(nanoSeconds);
        result = new Date(parseValue / 1000000);
    } catch (error) {
        console.log(error);
    } finally {
        return result;
    }
};

export const groupLinkListByDate = (
    linkList: LinkDetailModel[],
): Record<string, LinkDetailModel[]> => {
    if (linkList?.length > 0) {
        const sortedItems = linkList.sort((a, b) => b.create_at.getTime() - a.create_at.getTime());
        return sortedItems.reduce(
            (groups: Record<string, LinkDetailModel[]>, item: LinkDetailModel) => {
                const dateKey = item.create_at.toISOString().split("T")[0];
                if (!groups[dateKey]) {
                    groups[dateKey] = [];
                }
                groups[dateKey].push(item);
                return groups;
            },
            {},
        );
    } else {
        return {};
    }
};

export const formatDateString = (dateString: string): string => {
    if (dateString && dateString.trim() !== "") {
        const date = new Date(dateString);
        const monthShort = date.toLocaleString("default", { month: "short" });
        const day = date.getDate();
        const year = date.getFullYear();
        return `${monthShort} ${day}, ${year}`;
    } else {
        return "";
    }
};

export const getReponsiveClassname = (
    responsive: MediaQuery,
    responsiveObject: UIResponsiveType | undefined,
): string | undefined => {
    if (responsiveObject) {
        if (responsive.isSmallDevice) {
            return responsiveObject.responsive.mobile;
        } else if (responsive.isMediumDevice) {
            return responsiveObject.responsive.tablet ?? responsiveObject.responsive.mobile;
        } else if (responsive.isLargeDevice) {
            return responsiveObject.responsive.desktop ?? responsiveObject.responsive.mobile;
        } else if (responsive.isExtraLargeDevice) {
            return responsiveObject.responsive.widescreen ?? responsiveObject.responsive.mobile;
        }
    }
};
