import React, { useState } from 'react';
import { Link, makeStyles, Popover, Slider } from '@material-ui/core';
import PropTypes from 'prop-types';

const useStyles = makeStyles({
  root: {
    '&:hover': {
      'cursor': 'pointer' 
    }
  },
  SliderContainer: {
    minWidth: '300px',
    padding: '10px 30px'
  }
})

const ConfigSlider = (props) => {
  const classes = useStyles();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleLinkClicked = (event) => {
    setAnchorEl(event.target)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  return (
    <span className={classes.root}>
      <Link onClick={handleLinkClicked}>
        {props.value}
      </Link>
      <Popover 
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center"
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "center"
        }}
      >
      <div className={classes.SliderContainer}>
        <Slider 
          step={1}
          marks
          min={1}
          value={props.value}
          onChange={(_, val) => props.action(val)}
          max={props.maxValue || 15}
        />
      </div>
      </Popover>
    </span>
  );
}

ConfigSlider.propTypes = {
  value: PropTypes.number.isRequired,
  maxValue: PropTypes.number,
  action: PropTypes.func.isRequired
}

export default ConfigSlider;