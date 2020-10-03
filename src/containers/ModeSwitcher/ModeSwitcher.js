import React, { useState } from 'react';
import { Typography } from '@material-ui/core';
import * as modeTypes from '../../utility/modeTypes';
import './ModeSwitcher.css';
import PropTypes from 'prop-types';
import ModeConfigurator from '../ModeConfigurator';

const ModeSwitcher = (props) => {
  const [viewedMode, setViewedMode] = useState(modeTypes.LOOK_CLOSER); 
  const [isLoaderBusy, setLoaderBusy] = useState(false); 

  const modes = [
    modeTypes.LOOK_CLOSER,
    modeTypes.DIVE_DEEPER,
  ]

  const getModeInfo = (mode) => {
    const result = {
      action: () => setViewedMode(mode),
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
      <div className={`accordion-item ${viewedMode === m ? 'selected-mode' : ''}`} key={i} onClick={mode.action}>
        <h1>{mode.title}</h1>
        <div className="accordion-item-content">
          <p>{mode.desc}</p>
        </div>
      </div>
    )
  })

  return (
    <>
      <Typography variant="h6" align="center" color="textSecondary" component="p">
        Want to get to know better all of your artists and discover new ones?
      </Typography>
      <Typography variant="h6" align="center" color="textSecondary" component="p">
        Just select any mode and follow along.
      </Typography>
      <div className={`accordion ${isLoaderBusy ? 'disabled' : ''}`}>
        { modesElements }
      </div>
      <ModeConfigurator 
        mode={viewedMode} 
        showError={props.showError} 
        hideError={props.hideError}
        isAuth={props.isAuth}
        login={props.login}
        handleIsLoadingChanged={(isBusy) => setLoaderBusy(isBusy)}
      />
    </>
  );
}

ModeSwitcher.propTypes = {
  isAuth: PropTypes.bool.isRequired,
  showError: PropTypes.func.isRequired,
  login: PropTypes.func.isRequired
}

export default ModeSwitcher;