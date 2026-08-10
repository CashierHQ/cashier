import { error } from "@sveltejs/kit";
import { PUBLIC_SHARED_BUILD_TYPE } from "$env/static/public";

export const ssr = false;

export const load = (): void => {
  if (!new Set(["dev", "local"]).has(PUBLIC_SHARED_BUILD_TYPE)) {
    error(404, "Not found");
  }
};
