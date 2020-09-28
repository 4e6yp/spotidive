import React from 'react';
import { Button } from '@material-ui/core';
import * as modeTypes from '../../utility/modeTypes';
import './ModeSwitcher.css';
import PropTypes from 'prop-types';

const ModeSwitcher = (props) => {
  const modes = [
    modeTypes.LOOK_CLOSER,
    modeTypes.DIVE_DEEPER,
  ]

  const getModeInfo = (mode) => {
    const result = {
      action: () => props.changeMode(mode),
      title: '',
      desc: ''
    }

    switch (mode) {
      case modeTypes.DIVE_DEEPER:
        result.title = 'Dive Deeper'
        result.desc = `Discover brand new artists related to the ones from your library!`
        break;
    
      case modeTypes.LOOK_CLOSER:
        result.title = 'Look Closer'
        result.desc = `Discover the best unknown songs of familiar artists from your library!`    
        break;

      default:
        throw Error(`Unknown mode type '${mode}'`);
    }

    return result;
  }

  const modesElements = modes.map((m, i) => {
    const mode = getModeInfo(m);
    return (
      <div className={`accordion-item ${i === 0 ? 'selected-modes' : ''}`}>
        <h1>{mode.title}</h1>
        <div class="accordion-item-content">
          <p>{mode.desc}</p>
          <Button onClick={mode.action}>Let's get started</Button>
        </div>
      </div>
    )
  })

  return (
    <div class="accordion">
      { modesElements }
    </div>
  );
}

ModeSwitcher.propTypes = {
  isAuth: PropTypes.bool.isRequired,
  changeMode: PropTypes.func.isRequired,
  login: PropTypes.func.isRequired
}

export default ModeSwitcher;