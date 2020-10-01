import React from 'react';
import { Typography } from '@material-ui/core';
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
        result.desc = `Discover brand new artists related to the ones from your library! Recommended for everybody who wants to find new artists, similar to their favorite ones.`
        break;
    
      case modeTypes.LOOK_CLOSER:
        result.title = 'Look Closer'
        result.desc = `Discover the best unknown songs of familiar artists from your library! Find out what gems you might have missed.`
        break;

      default:
        throw Error(`Unknown mode type '${mode}'`);
    }

    return result;
  }

  const modesElements = modes.map((m, i) => {
    const mode = getModeInfo(m);
    return (
      <div className={`accordion-item ${props.viewedMode === m ? 'selected-mode' : ''}`} key={i} onClick={mode.action}>
        <h1>{mode.title}</h1>
        <div className="accordion-item-content">
          <p>{mode.desc}</p>
        </div>
      </div>
    )
  })

  return (
    <>
      <Typography variant="h5" align="center" color="textSecondary" component="p">
        Want to get to know better all of your artists and discover new ones? Then just <strong>select mode</strong> and follow anong.
      </Typography>
      <div className="accordion">
        { modesElements }
      </div>
    </>
  );
}

ModeSwitcher.propTypes = {
  isAuth: PropTypes.bool.isRequired,
  changeMode: PropTypes.func.isRequired,
  login: PropTypes.func.isRequired,
  viewedMode: PropTypes.string
}

export default ModeSwitcher;