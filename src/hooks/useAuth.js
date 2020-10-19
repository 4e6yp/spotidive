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

    if (expirationDate < new Date()) {
      setToken(null);
      setExpirationDate(null);
      errorMessage("Access token has expired")
      return
    }

    successMessage('Successfully authenticated in Spotify!');
  }, [expirationDate])

  useEffect(() => {
    if (!location.hash) {
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
  }, [location.hash])
}

export { useAuth }