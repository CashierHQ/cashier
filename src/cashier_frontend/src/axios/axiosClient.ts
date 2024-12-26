import axios from "axios";
import queryString from "query-string";

const icExplorerAxiosClient = axios.create({
    baseURL: import.meta.env.VITE_IC_EXPLORER_BASE_URL,
    headers: {},
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
