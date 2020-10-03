import { createMuiTheme } from '@material-ui/core/styles';

export default createMuiTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1DB954'
    }
  },
  typography: {
    fontFamily: [
      'Montserrat',
      'Roboto',
      'sans-serif'
    ].join(',')
  },
  components: {
    MuiButton: {
      styleOverrides:{
        label: {
          color: 'white',
          fontWeight: 'bold'
        }
      }
    },  
    MuiCssBaseline: {
      styleOverrides: {
        "@global": {
          body: {
            background: 'radial-gradient(circle, rgba(63,63,63,1) 0%, rgba(24,24,24,1) 100%)'          
          }
        }
      }
    },
    MuiStepper: {
      styleOverrides: {
        root: {
          backgroundColor: '#282828',
          padding: '20px'
        }
      }
    }
  }
});