import { createMuiTheme } from '@material-ui/core/styles';

const theme = createMuiTheme({
  palette: {
    type: 'dark',
    primary: {
      main: '#1DB954'
    }
  },
  // typography: {
  //   fontFamily: [
  //     'Verdana', 
  //     'Geneva', 
  //     'sans-serif'
  //   ].join(',')
  // },
  overrides: {
    MuiButton: {
      label: {
        color: 'white'
      }
    },
    MuiCssBaseline: {
      "@global": {
        body: {
          background: 'radial-gradient(circle, rgba(63,63,63,1) 0%, rgba(24,24,24,1) 100%)'          
        }
      }
    }
  }
});

export default theme;