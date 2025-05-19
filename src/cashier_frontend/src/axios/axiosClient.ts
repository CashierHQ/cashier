// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import axios from "axios";
import queryString from "query-string";

const icExplorerAxiosClient = axios.create({
    baseURL: import.meta.env.VITE_IC_EXPLORER_BASE_URL,
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
