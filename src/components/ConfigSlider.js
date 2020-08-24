import React from 'react';
import { Typography, Slider } from '@material-ui/core';
import PropTypes from 'prop-types';

const ConfigSlider = (props) => {
  return (
    <>
      <Typography gutterBottom>
        {`${props.title}: ${props.value}`}
      </Typography>
      <Slider 
        step={1}
        marks
        min={1}
        valueLabelDisplay="auto"
        value={props.value}
        onChange={(e, val) => props.action(val)}
        max={props.maxValue || 15}
      />
    </>
  );
}

ConfigSlider.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  maxValue: PropTypes.number,
  action: PropTypes.func.isRequired
}

export default ConfigSlider;