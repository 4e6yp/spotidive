import React from 'react';
import { Box, LinearProgress, Typography } from '@material-ui/core';
import PropTypes from 'prop-types';

const ProgressBar = (props) => {
  return (
    <Box display="flex" alignItems="center">
      <Box width="100%" mr={1}>
        <LinearProgress variant="determinate" value={props.progress} />
      </Box>
      <Box minWidth={35}>
        <Typography variant="body2" color="textSecondary">{props.nowLoadingText}</Typography>
      </Box>
    </Box>
  );
}

ProgressBar.propTypes = {
  progress: PropTypes.number.isRequired,
  nowLoadingText: PropTypes.string,
  loadingState: PropTypes.string
}

export default ProgressBar;