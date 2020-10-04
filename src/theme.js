import { createMuiTheme } from '@material-ui/core/styles';

const mainGreenColor = '#1DB954';

export default createMuiTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: mainGreenColor
    }
  },
  typography: {
    fontFamily: [
      'Montserrat',
      'Roboto',
      'sans-serif'
    ].join(','),
    fontSize: 12
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
    },
    MuiInput: {
      styleOverrides: {
        root: {
          color: mainGreenColor
        }
      }
    }
  }
});