import queryString from 'query-string';

function login() {
  const loginParams = {
    'client_id': process.env.REACT_APP_API_CLIENT_KEY,
    'response_type': 'token',
    'redirect_uri': `${process.env.REACT_APP_SPOTIFY_URL}/callback`,
    'scope': 'user-library-read playlist-modify-public playlist-read-private playlist-read-collaborative',
  };

  const query = queryString.stringify(loginParams);

  window.location.assign('https://accounts.spotify.com/authorize?' + query);
}

function calcExpirationDate(seconds) {
  const date = new Date();

  date.setTime(date.getTime() + seconds * 1000);

  return date;
}

export { login, calcExpirationDate }