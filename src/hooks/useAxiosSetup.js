import { useContext } from "react";
import axios from '../axios-spotifyClient';
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
import { AuthContext } from "../context/Auth";
import { AlertContext } from "../context/Alert";

async function wait(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    })
}

let requestsCounter = 0;
const requestsLimit = 50;
const cooldown = 4000;

function useAxiosSetup() {
    const { token, setToken, setExpirationDate } = useContext(AuthContext);
    const { errorMessage } = useContext(AlertContext);

    if (token) {
        axios.defaults.headers['Authorization'] = `Bearer ${token}`;
    }

    axiosRetry(axios, {
        retries: 5,
        retryCondition: e => {
            return isNetworkOrIdempotentRequestError(e) || `${e.response.status}`[0] === "5" || e.response.status === 429
        },
        retryDelay: (_, error) => {
            if (error.response.status === 429) {
                const retryAfter = parseInt(error.response.headers['retry-after']);
                return retryAfter ? (retryAfter * 1000) + 500 : 3000
            }
            return 3000;
        }
    })

    axios.interceptors.response.use(response => response, error => {
        if (error.response.status === 401 || error.response.status === 403) {
            setToken(null);
            setExpirationDate(null);
            errorMessage('Authentication expired, please relogin and try again');
        }
        return Promise.reject(error);
    })

    // Split requests into packs with delays in-between (due to api limitations)
    axios.interceptors.request.use(async req => {
        requestsCounter++;

        if (requestsCounter > requestsLimit) {
            const cooldownMultiplier = Math.floor(requestsCounter / requestsLimit);
            await wait(cooldown * cooldownMultiplier);

            // reset counter when all queued requests are finished
            requestsCounter = requestsCounter - 1 === requestsLimit ? 0 : requestsCounter - 1;
        }
        return req;
    })
}

export { useAxiosSetup }