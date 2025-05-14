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
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
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
