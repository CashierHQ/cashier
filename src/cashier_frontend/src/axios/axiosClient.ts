import axios from "axios";
import queryString from "query-string";

const axiosClient = axios.create({
    baseURL: "https://api.icexplorer.io/api",
    headers: {},
    paramsSerializer: {
        serialize: (params) => queryString.stringify(params),
    },
});

axiosClient.interceptors.response.use(
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

export default axiosClient;
