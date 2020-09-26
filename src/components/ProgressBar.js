import React from 'react';
import { Box, LinearProgress } from '@material-ui/core';
import PropTypes from 'prop-types';

const ProgressBar = (props) => {
  let bar = (
    <LinearProgress />
  )

  if (props.progress !== null) {
    bar = <LinearProgress variant="determinate" value={props.progress} />
  }

  return (
    <Box>
      { bar }
    </Box>
  );
}

ProgressBar.propTypes = {
  progress: PropTypes.number
}

export default ProgressBar;