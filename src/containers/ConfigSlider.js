import React, { useState } from 'react';
import { Link, Popover, Slider } from '@material-ui/core';
import PropTypes from 'prop-types';

const ConfigSlider = (props) => {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleLinkClicked = (event) => {
    setAnchorEl(event.target)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  return (
    <>
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
      <div style={{
        minHeight: '40px',
        minWidth: '300px',
        padding: '0 30px'
      }}>
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
    </>
  );
}

ConfigSlider.propTypes = {
  value: PropTypes.number.isRequired,
  maxValue: PropTypes.number,
  action: PropTypes.func.isRequired
}

export default ConfigSlider;