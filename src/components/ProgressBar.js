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
    <Box display="flex" alignItems="center">
      <Box width="100%" mr={1}>        
        { bar }
      </Box>
    </Box>
  );
}

ProgressBar.propTypes = {
  progress: PropTypes.number.isRequired
}

export default ProgressBar;