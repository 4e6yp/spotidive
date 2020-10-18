import React, { useContext } from 'react';
import { AlertContext } from "./context/Alert";
import { useAuth } from './hooks';
import ModeSwitcher from './containers/ModeSwitcher/ModeSwitcher';
import { Container, Box, Typography } from '@material-ui/core';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/core/Alert';
import GithubCorner from 'react-github-corner';

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const App = () => {
  useAuth()

  const {message, handleMessageClosed} = useContext(AlertContext)

  return (
    <Container maxWidth="md" component="main" style={{padding: '15px'}}>
      <Typography component="h3" variant="h3" align="center" color="textPrimary">
        Welcome to Spotidive!
      </Typography>
      <Box>
        <ModeSwitcher />
      </Box>
      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        open={message.isVisible}
        autoHideDuration={ message.alertType === 'success' ? 3000 : null }
        onClose={(_, reason) => handleMessageClosed(reason)}
      >
        <Alert
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