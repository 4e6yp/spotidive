import { useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import queryString from 'query-string';
import { useInterceptors } from '../hooks';
import { AlertContext } from '../context/Alert';
import { AuthContext } from '../context/Auth';
import { calcExpirationDate } from '../utility/login';
import axios from '../axios-spotifyClient';

function useAuth() {
  useInterceptors()

  const location = useLocation()
  const navigate = useNavigate()

  const { successMessage } = useContext(AlertContext)
  const { token, setToken, setTokenChecked, expirationDate, setExpirationDate } = useContext(AuthContext)

  useEffect(() => {
    if (!expirationDate) {
      return
    }

    if (expirationDate < new Date()) {
      setToken(null);
      setExpirationDate(null);
      return
    }

    axios.defaults.headers['Authorization'] = `Bearer ${token}`;

    setTokenChecked(true)
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

    navigate("/")
  }, [location.hash])
}

export { useAuth }