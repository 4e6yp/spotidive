import { useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { AlertContext } from '../context/Alert';
import { AuthContext } from '../context/Auth';
import { calcExpirationDate } from '../utility/login';

function useAuth() {
  const location = useLocation()

  const { errorMessage, successMessage } = useContext(AlertContext)
  const { setToken, expirationDate, setExpirationDate } = useContext(AuthContext)

  useEffect(() => {
    if (!expirationDate) {
      return
    }

    if (new Date(expirationDate) < new Date()) {
      setToken(null);
      setExpirationDate(null);
      errorMessage("Authentication expired, please relogin and try again")
      return
    }

    successMessage('Successfully authenticated in Spotify!');
  }, [expirationDate, setExpirationDate, errorMessage, setToken, successMessage])

  useEffect(() => {
    if (location.pathname !== '/callback') {
      return
    }

    if (!location.hash) {
      errorMessage('Authentication in Spotify failed, please try again')
      return
    }

    const parsedHash = queryString.parse(location.hash);
    const responseToken = parsedHash['access_token'];

    if (!responseToken) {
      throw new Error(`Access token is not provided in '/authorize' response`);
    }

    const expirationDate = calcExpirationDate(parsedHash.expires_in);

    setToken(responseToken);
    setExpirationDate(expirationDate);
  }, [location, errorMessage, setExpirationDate, setToken])
}

export { useAuth }