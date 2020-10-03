import React, { useState, useEffect, useCallback, useReducer } from 'react';
import ModeSwitcher from './containers/ModeSwitcher/ModeSwitcher';
import axios from './axios-spotifyClient';
import queryString from 'query-string';
import { Container, Box, Typography } from '@material-ui/core';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/core/Alert';
import GithubCorner from 'react-github-corner';
import {messageReducer, messageActions } from './reducers/MessageReducer'

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const App = () => {
  const [token, setToken] = useState(null);

  const [message, setMessage] = useReducer(messageReducer, {
    isVisible: false,
    text: null,
    alertType: 'success'
  })

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
      setMessage({type: messageActions.SHOW_SUCCESS_MESSAGE, text: 'Successfully authenticated in Spotify!'});
    }
  }

  axios.interceptors.response.use(response => response, error => {
    if (error.response.status === 401 || error.response.status === 403) {
      setToken(null);
      localStorage.clear();
      showNewError('Authentication expired, please relogin and try again');
    }
    return Promise.reject(error);
  })

  const showNewError = useCallback((text = 'Error occured, please try again') => {
    if (typeof text !== 'string' && text !== null) {
      console.log(text);
      text = 'Error occured, please try again';
    }
    setMessage({type: messageActions.SHOW_ERROR_MESSAGE, text: text});
  }, [])

  const handleMessageClosed = (reason) => {
    if (reason === 'clickaway') {
      return;
    }

    setMessage({type: messageActions.HIDE_MESSAGE});
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
        showNewError('Authentication in Spotify failed, please try again');        
      }
    }
    else {
      checkSavedToken();
    }
  }, [showNewError])

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
      query+=`${key}=${loginParams[key]}&`;
    };

    window.location.href = 'https://accounts.spotify.com/authorize?'+query;
  };

  return (
    <Container maxWidth="md" component="main" style={{padding: '20px'}}>
      <Typography component="h3" variant="h3" align="center" color="textPrimary">
        Welcome!
      </Typography>
      <Box>
        <ModeSwitcher isAuth={token !== null} login={loginHandler} showError={showNewError} hideError={() => setMessage({type: messageActions.HIDE_MESSAGE})}/>
      </Box>
      <Snackbar 
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        open={message.isVisible}
        autoHideDuration={ message.alertType === 'success' ? 3000 : null }
        onClose={(_, reason) => handleMessageClosed(reason)}
      >
        <Alert 
          // variant='filled'
          severity={message.alertType}
          onClose={handleMessageClosed}
        >
          { message.text }
        </Alert>
      </Snackbar>
      <GithubCorner href="https://github.com/4e6yp/spotidive" target="_blank"/>
    </Container>
  );
}

export default App;