import * as modeTypes from '../utility/modeTypes'

export default {
  FETCH_PLAYLIST_TRACKS: {
    id: 'FETCH_PLAYLIST_TRACKS',
    title: 'Collecting all playlist tracks',
    modes: [
      modeTypes.LOOK_CLOSER,
      modeTypes.DIVE_DEEPER
    ]
  },
  SELECT_ARTISTS_FROM_PLAYLIST: {
    id: 'SELECT_ARTISTS_FROM_PLAYLIST',
    title: 'Selecting artists above threshold',
    modes: [
      modeTypes.LOOK_CLOSER,
      modeTypes.DIVE_DEEPER
    ]
  },
  FETCH_RELATED_ARTISTS: {
    id: 'FETCH_RELATED_ARTISTS',
    title: 'Selecting related artists',
    modes: [
      modeTypes.DIVE_DEEPER
    ]
  },
  FETCH_ARTIST_TOP_TRACKS: {
    id: 'FETCH_ARTIST_TOP_TRACKS',
    title: 'Collecting tracks from selected artists',
    modes: [
      modeTypes.LOOK_CLOSER,
      modeTypes.DIVE_DEEPER
    ]
  },
  ADD_TRACKS_TO_PLAYLIST: {
    id: 'ADD_TRACKS_TO_PLAYLIST',
    title: 'Adding tracks to playlist',
    modes: [
      modeTypes.LOOK_CLOSER,
      modeTypes.DIVE_DEEPER
    ]
  }
} 

// LOOK_CLOSER = FETCH_PLAYLIST_TRACKS + FETCH_ARTIST_TOP_TRACKS + ADD_TRACKS_TO_PLAYLIST
// DIVE_DEEPER = FETCH_PLAYLIST_TRACKS + FETCH_RELATED_ARTISTS + FETCH_ARTIST_TOP_TRACKS + ADD_TRACKS_TO_PLAYLIST
