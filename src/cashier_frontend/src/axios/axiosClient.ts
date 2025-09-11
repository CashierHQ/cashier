// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { IC_EXPLORER_BASE_URL } from "@/const";
import axios from "axios";
import queryString from "query-string";

const icExplorerAxiosClient = axios.create({
  baseURL: IC_EXPLORER_BASE_URL,
  headers: {
    accept: "application/json",
    "cache-control": "no-cache",
    "content-type": "application/json",
    pragma: "no-cache",
    priority: "u=1, i",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  },
  paramsSerializer: {
    serialize: (params) => queryString.stringify(params),
  },
});

icExplorerAxiosClient.interceptors.response.use(
  (response) => {
    if (response && response.data) {
      return response.data;
    }

    return response;
  },
  (err) => {
    return Promise.reject(err.response);
  },
);

export default icExplorerAxiosClient;
