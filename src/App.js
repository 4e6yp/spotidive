import React, { useState, useEffect } from 'react';
import ModeSwitcher from './components/ModeSwitcher/ModeSwitcher';
import * as modeTypes from './utility/modeTypes';
import axios from './axios-spotifyClient';
import queryString from 'query-string';
import { Container, Box, Typography, Snackbar } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import ModeConfigurator from './containers/ModeConfigurator';
import Loader from './containers/Loader';

const App = () => {
  const [token, setToken] = useState(null);
  const [viewedMode, setViewedMode] = useState(modeTypes.LOOK_CLOSER);

  const [message, setMessage] = useState(null);

  const [loaderIsBusy, setLoaderIsBusy] = useState(false);

  const checkSavedToken = () => {
    const expirationDate = new Date(localStorage.getItem('expirationDate'));

    if (expirationDate < new Date()) {
      setToken(null);

      localStorage.clear();
    }
    else {
      const newToken = localStorage.getItem('token')
      setToken(newToken);
      
      axios.defaults.headers = {
        'Authorization': 'Bearer ' + newToken
      };
    }
  }

  // Handle auth and callback 
  useEffect(() => {
    if (window.location.pathname === '/callback') {    
      if (window.location.hash) { // success
        const parsedHash = queryString.parse(window.location.hash);
        
        const responseToken = parsedHash['access_token'];
        if (responseToken) {          
          localStorage.setItem('token', responseToken);

          const expirationDate = new Date(new Date().getTime() + Number.parseInt(parsedHash.expires_in) * 1000);
          localStorage.setItem('expirationDate', expirationDate);

          window.location.href = '/';
        } else {
          throw new Error(`Access token is not provided in '/authorize' response`);
        }
      } 
      else {
        setMessage('Authentication in Spotify failed, please try again');        
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
      'scope': 'user-library-read playlist-modify-public',
    };

    let query = '';

    for (let key in loginParams) {
      query+=`${key}=${loginParams[key]}&`;
    };

    window.location.href = 'https://accounts.spotify.com/authorize?'+query;
  };

  return (
    <Container maxWidth="md" component="main">
      <Typography component="h1" variant="h2" align="center" color="textPrimary">
        Welcome!
      </Typography>
      <Typography variant="h5" align="center" color="textSecondary" component="p">
        Wanna get to know better all of your artists and discover new ones? You are at the right place.
      </Typography>
      <Box>
        <ModeSwitcher changeMode={setViewedMode} isAuth={token !== null} login={loginHandler}/>
        {
          token !== null
          ? <ModeConfigurator mode={viewedMode} />
          : null
        }
      </Box>
      <Snackbar 
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        open={!!message}
      >
        <Alert 
          variant="filled"
          severity='error'
        >
          { message }
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default App;