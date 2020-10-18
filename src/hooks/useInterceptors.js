import { useContext } from 'react';
import { AlertContext } from "../context/Alert";
import { AuthContext } from '../context/Auth';
import axios from '../axios-spotifyClient';

function useInterceptors() {
  const { errorMessage } = useContext(AlertContext);
  const { setToken, setExpirationDate } = useContext(AuthContext);

  axios.interceptors.response.use(response => response, error => {
    if (error.response.status === 401 || error.response.status === 403) {
      setToken(null);
      setExpirationDate(null);
      errorMessage('Authentication expired, please relogin and try again');
    }
    return Promise.reject(error);
  })
}

export { useInterceptors }