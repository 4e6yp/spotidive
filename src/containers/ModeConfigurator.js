import React, { useState, useEffect } from 'react';
import * as modeTypes from '../utility/modeTypes';
import PropTypes from 'prop-types';
import Loader from './Loader';
import { Button, Box, MenuItem, FormControl, InputLabel, Select, Container, TextField, Typography, Stepper, Step, StepLabel, StepContent, Link } from '@material-ui/core';
import ConfigSlider from './ConfigSlider';

const ModeConfigurator = (props) => {
  const { showError } = props;
  const [playlists, setPlaylists] = useState([]);

  const [modeConfig, setModeConfig] = useState({
    selectedMode: null,
    viewedMode: null,
    artistTracksThreshold: 15,
    targetQuantityPerArtist: 5,
    relatedArtistsQuantity: 10,
    newPlaylistName: `${document.title} Playlist`,
    selectedPlaylist: 0         // default is 0 (library)
  })

  useEffect(() => {
    setModeConfig(curConfig => ({
      ...curConfig,
      viewedMode: props.mode
    }))
  }, [props.mode])

  const configValueChangedHandler = (type, value) => {
    setModeConfig(config => ({
        ...config,
        [type]: value
      })
    );
    showError(null);
  }

  let playlistsSelector = null;

  if (playlists) {
    const playlistItems = playlists.map(p => <MenuItem key={p.id} value={p.id} >{p.name} ({p.tracksTotal})</MenuItem>)

    playlistsSelector = (
      <FormControl style={{minWidth: 300}}>
        <InputLabel id="playlistsSelect">Select target playlist:</InputLabel>
        <Select labelId="playlistsSelect" value={modeConfig.selectedPlaylist} onChange={(event) => configValueChangedHandler('selectedPlaylist', event.target.value)}>
          <MenuItem value={0}>Library</MenuItem>
          { playlistItems }
        </Select>
      </FormControl>
    )
  }

  const steps = {
    SELECT_PLAYLIST: 'Select playlist',
    SET_TRACKS_THRESHOLD: 'Set tracks threshold',
    SET_RELATED_ARTISTS_LIMIT: 'Set related artists limit',
    SET_TRACKS_LIMIT_PER_ARTIST: 'Set tracks limit per artist',
    SELECT_PLAYLIST_NAME: 'Select playlist name'
  }

  const getStepContent = (step) => {
    switch (step) {
      case steps.SELECT_PLAYLIST:
        let playlistItems = null;
        if (playlists) {
          playlistItems = playlists.map(p => <MenuItem key={p.id} value={p.id} >{p.name} ({p.tracksTotal})</MenuItem>)
        }
        
        const playlistsSelector = (
          <FormControl style={{minWidth: 300}}>
            <Select labelId="playlistsSelect" value={modeConfig.selectedPlaylist} onChange={(event) => configValueChangedHandler('selectedPlaylist', event.target.value)}>
              <MenuItem value={0}>Library</MenuItem>
              { playlistItems }
            </Select>
          </FormControl>
        )

        return <Typography>
          Firstly, it will collect all of your saved tracks from {playlistsSelector}
        </Typography>;

      case steps.SET_TRACKS_THRESHOLD:
        const artistThresholdParam = <ConfigSlider 
          action={(value) => configValueChangedHandler('artistTracksThreshold', value)}
          value={modeConfig.artistTracksThreshold}
          maxValue={15}
        />

        return <Typography>
          Then it will group those tracks by artists. And filter out artists with more than {artistThresholdParam} tracks saved.
        </Typography>;

      case steps.SET_RELATED_ARTISTS_LIMIT:
        const relatedArtistsParam = <ConfigSlider 
          action={(value) => configValueChangedHandler('relatedArtistsQuantity', value)}
          value={modeConfig.relatedArtistsQuantity}
          maxValue={20}
        />

        return <Typography>
          For each of the selected artist it will get {relatedArtistsParam} related artists, but only get the ones who has no saved tracks in your library.
        </Typography>;

      case steps.SET_TRACKS_LIMIT_PER_ARTIST:
        const targetQuantityParam = <ConfigSlider 
          title="Target tracks quantity per artist"
          action={(value) => configValueChangedHandler('targetQuantityPerArtist', value)}
          value={modeConfig.targetQuantityPerArtist}
          maxValue={10}
        />

        return <Typography>
          For each entry of the final artists list it will get {targetQuantityParam} of it's top tracks.
        </Typography>;

      case steps.SELECT_PLAYLIST_NAME:
        const playlistNameParam = <TextField 
          value={modeConfig.newPlaylistName}
          onChange={(event) => configValueChangedHandler("newPlaylistName", event.target.value)}
        />
        return <Typography>
          Finally, it will add the whole bunch of selected tracks (about 1245 at max) to the newely created playlist {playlistNameParam}
        </Typography>;

      default:
        return null;
    }
  }

  return (
    <>    
      <Container>
        <Box>
          <Typography variant="h4">HOW IT WORKS</Typography>
          <Stepper nonLinear={true} orientation="vertical">
            {
              Object.keys(steps).map(stepKey => (
                <Step key={stepKey} active>
                  <StepLabel>{steps[stepKey]}</StepLabel>
                  <StepContent>{getStepContent(steps[stepKey])}</StepContent>
                </Step>
              ))
            }
          </Stepper>
        </Box>
      </Container>

      <Loader 
        configData={modeConfig} 
        setPlaylists={setPlaylists}
        showError={showError}
      />

      <Button onClick={() => configValueChangedHandler('selectedMode', props.mode)}>
        Start Process
      </Button>
    </>
  );
}

ModeConfigurator.propTypes = {
  mode: PropTypes.oneOf(Object.values(modeTypes)).isRequired,
  showError: PropTypes.func.isRequired
}

export default ModeConfigurator;