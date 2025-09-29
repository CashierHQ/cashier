import type { TokenPrice } from "../types";

let tokenPrices = $state<TokenPrice[]>([]);
let isLoading = $state<boolean>(false);

export const tokenStore = {
  get tokenPrices() {
    return tokenPrices;
  },

  set tokenPrices(value: TokenPrice[]) {
    tokenPrices = value;
  },

  get isLoading() {
    return isLoading;
  },

  set isLoading(value: boolean) {
    isLoading = value;
  },
};
