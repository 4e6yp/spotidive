import React, { useState, useEffect } from 'react';
import * as modeTypes from '../utility/modeTypes';
import ConfigSlider from '../components/ConfigSlider';
import PropTypes from 'prop-types';
import Loader from './Loader';
import { Button, Box, MenuItem, FormControl, InputLabel, Select, Container, TextField } from '@material-ui/core';

const ModeConfigurator = (props) => {
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
    )
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

  return (
    <>    
      <Container>
        <Box>
          <TextField 
            label="New playlist name" 
            value={modeConfig.newPlaylistName}
            onChange={(event) => configValueChangedHandler("newPlaylistName", event.target.value)}
          />

          <ConfigSlider 
            title="Minimal tracks threshold for one artist"
            action={(value) => configValueChangedHandler('artistTracksThreshold', value)}
            value={modeConfig.artistTracksThreshold}
            maxValue={15}
          />

          <ConfigSlider 
            title="Target tracks quantity per artist"
            action={(value) => configValueChangedHandler('targetQuantityPerArtist', value)}
            value={modeConfig.targetQuantityPerArtist}
            maxValue={10}
          />

          {
            props.mode === modeTypes.DIVE_DEEPER && (
              <ConfigSlider 
                title="Target related artists quantity"
                action={(value) => configValueChangedHandler('relatedArtistsQuantity', value)}
                value={modeConfig.relatedArtistsQuantity}
                maxValue={20}
              />
            )
          }
        </Box>
          
        <Box>
          { playlistsSelector }
        </Box>
      </Container>

      <Loader 
        configData={modeConfig} 
        setPlaylists={setPlaylists}
      />

      <Button onClick={() => configValueChangedHandler('selectedMode', props.mode)}>
        Start Process
      </Button>
    </>
  );
}

ModeConfigurator.propTypes = {
  mode: PropTypes.oneOf(Object.values(modeTypes)).isRequired
}

export default ModeConfigurator;