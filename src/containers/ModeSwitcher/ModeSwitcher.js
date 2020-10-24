import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom"
import { useLocalStorage} from "../../hooks"
import { Typography } from '@material-ui/core';
import {modes, pathMap, DIVE_DEEPER, LOOK_CLOSER} from '../../utility/modeTypes';
import './ModeSwitcher.css';
import ModeConfigurator from '../ModeConfigurator';

const ModeSwitcher = () => {
  const navigate = useNavigate();

  const [viewedMode, setViewedMode] = useLocalStorage("current_mode", LOOK_CLOSER);
  const [isLoaderBusy, setLoaderBusy] = useState(false);

  useEffect(() => {
    navigate(pathMap[viewedMode], {replace: true})
  }, [viewedMode, navigate])

  const getModeInfo = (mode) => {
    const result = {
      action: () => setViewedMode(mode),
      title: '',
      desc: ''
    }

    switch (mode) {
      case DIVE_DEEPER:
        result.title = 'Dive Deeper'
        result.desc = `Discover brand new artists related to the ones from your library! Find the new voices for your own taste.`
        break;

      case LOOK_CLOSER:
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
        Want to get to know all of your Spotify artists better and discover new ones?
      </Typography>
      <Typography variant="h6" align="center" color="textSecondary" component="p">
        Just select any mode and follow along.
      </Typography>
      <div className={`accordion ${isLoaderBusy ? 'disabled' : ''}`}>
        { modesElements }
      </div>
      <ModeConfigurator
        mode={viewedMode}
        handleIsLoadingChanged={(isBusy) => setLoaderBusy(isBusy)}
      />
    </>
  );
}

export default ModeSwitcher;