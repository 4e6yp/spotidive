import React from 'react';
import { Paper, makeStyles } from '@material-ui/core';
import PropTypes from 'prop-types';

const useStyles = makeStyles({
  root: {
    display: 'inline-block',
    minWidth: '40%',
    padding: '20px',
    margin: 'auto',
    textAlign: 'center'
  }
})

const Mode = (props) => {
  const classes = useStyles();

  return (
    <Paper className={classes.root} elevation={3}>
      <h1>{props.title}</h1>
      <p>{props.desc}</p>
      { props.changeModeBtn }
    </Paper>
  );
}

Mode.propTypes = {
  desc: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  changeModeBtn: PropTypes.element.isRequired
}

export default Mode;