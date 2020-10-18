import { useContext, useEffect, useState } from "react";
import queryString from 'query-string';
import { useLocalStorage } from "./useLocalStorage";
import { AlertContext } from "../context/Alert";
import axios from '../axios-spotifyClient';

function useAuth() {
  const { successMessage, errorMessage } = useContext(AlertContext)
  const [token, setToken] = useLocalStorage("token", null);
  const [expirationDate, setExpirationDate] = useLocalStorage("expiration_date", null);
  const [tokenChecked, setTokenChecked] = useState(false);

  useEffect(() => {
    const checkSavedToken = () => {
      if (expirationDate < new Date()) {
        setToken(null);
        setExpirationDate(null);
      }
      else {
        axios.defaults.headers = {
          'Authorization': 'Bearer ' + token
        };
        setTokenChecked(true)
        successMessage('Successfully authenticated in Spotify!');
      }
    }

    axios.interceptors.response.use(response => response, error => {
      if (error.response.status === 401 || error.response.status === 403) {
        setToken(null)
        setExpirationDate(null)
        errorMessage('Authentication expired, please relogin and try again');
      }
      return Promise.reject(error);
    })

    // Handle auth and callback
    if (window.location.pathname === '/callback') {
      if (window.location.hash) { // success
        const parsedHash = queryString.parse(window.location.hash);

        const responseToken = parsedHash['access_token'];
        if (responseToken) {
          setToken(responseToken);

          const expirationDate = new Date(new Date().getTime() + Number.parseInt(parsedHash.expires_in) * 1000);
          setExpirationDate(expirationDate);

          window.location.href = '/';
        } else {
          throw new Error(`Access token is not provided in '/authorize' response`);
        }
      }
      else {
        errorMessage('Authentication in Spotify failed, please try again');
      }
    }
    else {
      checkSavedToken();
    }
  }, [])

  const loginHandler = () => {
    if (token) {
      return;
    }

    const loginParams = {
      'client_id': process.env.REACT_APP_API_CLIENT_KEY,
      'response_type': 'token',
      'redirect_uri': `${process.env.REACT_APP_SPOTIFY_URL}/callback`,
      'scope': 'user-library-read playlist-modify-public playlist-read-private playlist-read-collaborative',
    };

    let query = '';

    for (let key in loginParams) {
      query += `${key}=${loginParams[key]}&`;
    };

    window.location.href = 'https://accounts.spotify.com/authorize?' + query;
  };

  return {
    isAuth: tokenChecked && token,
    login: loginHandler
  }

}

export { useAuth }