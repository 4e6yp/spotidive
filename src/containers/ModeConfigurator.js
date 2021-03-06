import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { AlertContext } from "../context/Alert";
import { AuthContext } from '../context/Auth';
import * as modeTypes from '../utility/modeTypes';
import PropTypes from 'prop-types';
import Loader from './Loader';
import { MenuItem, FormControl, Select, TextField, Typography, Stepper, Step, StepLabel, StepContent, makeStyles, Tooltip } from '@material-ui/core';
import ConfigSlider from './ConfigSlider';
import processSteps from '../utility/processSteps';

const useStyles = makeStyles({
  Header: {
    paddingBottom: '10px'
  },
  Selector: {
    bottom: '3px',
    maxWidth: '300px'
  },
  Textfield: {
    bottom: '4px',
    maxWidth: '140px',
  },
  menuPaper: {
    maxHeight: '350px',
    maxWidth: '450px'
  },
  Stepper: {
    'box-shadow': '0px 0px 10px 5px rgba(0,0,0,0.5)'
  }
})

const ModeConfigurator = ({ mode, handleIsLoadingChanged }) => {
  const classes = useStyles();

  const authContext = useContext(AuthContext)
  const {hideMessage} = useContext(AlertContext)

  const [playlists, setPlaylists] = useState([]);

  const [modeConfig, setModeConfig] = useState({
    viewedMode: mode,
    artistTracksThreshold: 3,
    targetQuantityPerArtist: 5,
    relatedArtistsQuantity: 10,
    newPlaylistName: `${document.title} Playlist`,
    selectedPlaylist: 0         // default is 0 (library)
  })

  const [isSubmitEnabled, setIsSubmitEnabled] = useState(true);

  const steps = useMemo(() => {
    return Object.keys(processSteps).reduce((result, key) => {
      result[key] = {
        ...processSteps[key],
        isCompleted: false,
      };
      return result;
    }, {})
  }, []);

  const [stepsToShow, setStepsToShow] = useState(steps);

  const [calculatedTracksCount, setCalculatedTracksCount] = useState(null);

  const [isDisabled, setIsDisabled] = useState(false);

  const setStepCompleted = (step) => {
    setStepsToShow(oldSteps => {
      const newSteps = {
        ...oldSteps,
      }
      if (newSteps[step]) {
        newSteps[step].isCompleted = true;
      }
      return newSteps;
    })
  }

  useEffect(() => {
    setModeConfig(curConfig => ({
      ...curConfig,
      viewedMode: mode
    }))

    const updatedSteps = {...steps};
    for (let step in updatedSteps) {
      if (!updatedSteps[step].modes.includes(mode)) {
        delete updatedSteps[step];
      }
    }

    setStepsToShow(updatedSteps);
  }, [mode, steps])

  const configValueChangedHandler = (type, value) => {
    if (type === 'newPlaylistName') {
      if (!(value === '') !== isSubmitEnabled) {
        setIsSubmitEnabled(value !== '');
      }
    }
    setModeConfig(config => ({
        ...config,
        [type]: value
      })
    );
    hideMessage();
  }

  const handleStepsRecalculated = (newCount) => {
    if (modeConfig.selectedPlaylist === 0) {
      setCalculatedTracksCount(newCount);
    } else {
      setCalculatedTracksCount(null)
    }
  }

  const wrapDisabledInputWithTooltip = useCallback((component) => {
    let newComponent = component;

    if (!authContext.isAuth) {
      newComponent = <Tooltip title="You need to login in order to change values">
        <span>
          {component}
        </span>
      </Tooltip>
    }

    return newComponent;
  }, [authContext.isAuth])

  const getStepContent = (step) => {
    switch (step) {
      case steps.FETCH_PLAYLIST_TRACKS.id:
        let playlistItems = null;
        if (playlists) {
          playlistItems = playlists.map(p => <MenuItem key={p.id} value={p.id} >{p.name} ({p.tracksTotal})</MenuItem>)
        }

        const playlistsSelector = (
          <FormControl className={classes.Selector}>
            <Select
              labelId="playlistsSelect"
              value={modeConfig.selectedPlaylist}
              onChange={(event) => configValueChangedHandler('selectedPlaylist', event.target.value)}
              MenuProps={{ classes: {paper: classes.menuPaper} }}
              classes={{select: classes.SelectorLabel}}
              disabled={!authContext.isAuth}
            >
              <MenuItem value={0}>Library</MenuItem>
              { playlistItems }
            </Select>
          </FormControl>
        )

        return <Typography component={'div'}>
          Firstly, app will collect all of your saved tracks from {wrapDisabledInputWithTooltip(playlistsSelector)}
        </Typography>;

      case steps.SELECT_ARTISTS_FROM_PLAYLIST.id:
        const artistThresholdParam = <ConfigSlider
          action={(value) => configValueChangedHandler('artistTracksThreshold', value)}
          value={modeConfig.artistTracksThreshold}
          maxValue={15}
          disabled={!authContext.isAuth}
        />

        return <Typography component={'div'}>
          Then it will group collected tracks by artists. And filter out all entries with at least {wrapDisabledInputWithTooltip(artistThresholdParam)} track{modeConfig.artistTracksThreshold > 1 ? 's' : ''} saved (within selected playlist).
        </Typography>;

      case steps.FETCH_RELATED_ARTISTS.id:
        const relatedArtistsParam = <ConfigSlider
          action={(value) => configValueChangedHandler('relatedArtistsQuantity', value)}
          value={modeConfig.relatedArtistsQuantity}
          maxValue={20}
          disabled={!authContext.isAuth}
        />

        return <Typography component={'div'}>
          For each of the selected artist it will get {wrapDisabledInputWithTooltip(relatedArtistsParam)} related artists, but only get the ones who has no saved tracks in your library.
        </Typography>;

      case steps.FETCH_ARTIST_TOP_TRACKS.id:
        const targetQuantityParam = <ConfigSlider
          title="Target tracks quantity per artist"
          action={(value) => configValueChangedHandler('targetQuantityPerArtist', value)}
          value={modeConfig.targetQuantityPerArtist}
          maxValue={10}
          disabled={!authContext.isAuth}
        />

        return <Typography component={'div'}>
          For each of the found artists it will get {wrapDisabledInputWithTooltip(targetQuantityParam)} of his top tracks.
        </Typography>;

      case steps.ADD_TRACKS_TO_PLAYLIST.id:
        const playlistNameParam = <TextField className={classes.Textfield}
          value={modeConfig.newPlaylistName}
          onChange={(event) => configValueChangedHandler("newPlaylistName", event.target.value)}
          disabled={!authContext.isAuth}
          inputProps={{ spellCheck: 'false' }}
        />
        return <Typography component={'div'}>
          Finally, it will add all selected tracks {calculatedTracksCount ? `(about ${calculatedTracksCount} at max) ` : ''}to the newly created playlist {wrapDisabledInputWithTooltip(playlistNameParam)}
        </Typography>;

      default:
        return null;
    }
  }

  const handleProcessStarted = () => {
    setIsDisabled(true);
    handleIsLoadingChanged(true);
  }

  const handleProcessCompleted = () => {
    setIsDisabled(false);
    handleIsLoadingChanged(false);

    setStepsToShow(steps => {
      const newSteps = {...steps};
      for (let step in newSteps) {
        newSteps[step].isCompleted = false;
      }
      return newSteps;
    })
  }

  return (
    <>
      <Typography variant="h4" align="center" className={classes.Header}>HOW IT WORKS</Typography>
      <Stepper nonLinear={true} orientation="vertical" className={classes.Stepper}>
        {
          Object.keys(stepsToShow).map(stepKey => (
            <Step key={stepKey} expanded={!isDisabled} active={false} completed={steps[stepKey].isCompleted}>
              <StepLabel>{steps[stepKey].title}</StepLabel>
              <StepContent>{getStepContent(stepKey)}</StepContent>
            </Step>
          ))
        }
      </Stepper>

      <Loader
        configData={modeConfig}
        setPlaylists={setPlaylists}
        setRecalculatedTracks={handleStepsRecalculated}
        reenableConfigurator={handleProcessCompleted}
        disableConfigurator={handleProcessStarted}
        setStepCompleted={(step) => setStepCompleted(step)}
        isSubmitEnabled={isSubmitEnabled}
      />
    </>
  );
}

ModeConfigurator.propTypes = {
  mode: PropTypes.oneOf(Object.values(modeTypes)).isRequired,
  handleIsLoadingChanged: PropTypes.func.isRequired
}

export default ModeConfigurator;