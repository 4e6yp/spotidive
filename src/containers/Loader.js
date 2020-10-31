import React, { useState, useEffect, useCallback, useReducer, useMemo, useContext } from 'react';
import { AlertContext } from "../context/Alert";
import { AuthContext } from '../context/Auth';
import * as modeTypes from '../utility/modeTypes';
import PropTypes from 'prop-types';
import axios from '../axios-spotifyClient';
import { Typography, Box, Button, makeStyles, LinearProgress, Dialog, Zoom, DialogActions } from '@material-ui/core';
import CreatedPlaylistPaper from '../components/CreatedPlaylistPaper';
import processSteps from '../utility/processSteps';
import { allSettledRequests, synchFetchMultiplePages } from '../utility/Loader';
import { spotifyDataActions, spotifyDataReducer } from '../reducers/SpotifyReducer';
import { progressBarActions, progressBarReducer } from '../reducers/ProgressBarReducer';

const useStyles = makeStyles({
  root: {
    textAlign: 'center'
  },
  Button: {
    marginTop: '20px'
  },
  Modal: {
    backdropFilter: 'blur(5px)'
  },
  ModalContentContainer: {
    textAlign: 'center',
    backgroundColor: '#282828',
    padding: '40px'
  },
  ModalPlaylists: {
    display: 'flex',
    justifyContent: 'space-evenly',
    flexWrap: 'wrap',
    paddingTop: '30px'
  },
  ModalActions: {
    justifyContent: 'center'
  }
});

const ModalTransition = React.forwardRef((props, ref) => <Zoom ref={ref} {...props} />);

const Loader = (props) => {
  const classes = useStyles();
  const {isAuth, login} = useContext(AuthContext);
  const {errorMessage} = useContext(AlertContext);

  const {
    setPlaylists,
    configData,
    setRecalculatedTracks,
    disableConfigurator,
    reenableConfigurator,
    setStepCompleted
  } = props;

  const [spotifyData, spotifyDataDispatch] = useReducer(spotifyDataReducer, {
    tracks: [],
    artists: {},
    fetch: {
      pending: false,
      finished: false
    }
  })

  const [spotifyUserId, setSpotifyUserId] = useState(null);

  const [progress, progressDispatch] = useReducer(progressBarReducer, {
    stepPercent: 0,
    current: 0,
    total: 0
  })

  const setTotalProgress = (total, stepPercent) => {
    progressDispatch({
      type: progressBarActions.SET_TOTAL_PROGRESS,
      stepPercent: stepPercent,
      total: total
    })
  }

  const incrementProgress = () => {
    progressDispatch({
      type: progressBarActions.INCREMENT_PROGRESS
    })
  }

  const resetProgress = () => {
    progressDispatch({
      type: progressBarActions.RESET_PROGRESS
    })
  }

  const [addedArtists, setAddedArtists] = useState([]);

  const closeModal = () => {
    setModal({
      isVisible: false,
      content: null
    })
  }

  const [modal, setModal] = useState({
    isVisible: false,
    content: null
  });

  // const [modal, setModal] = useState({
  //   isVisible: false,
  //   content: <Box className={classes.ModalContentContainer}>
  //     <Typography variant='h4'>Enjoy your new playlist!</Typography>
  //     <div className={classes.ModalPlaylists}>
  //       <CreatedPlaylistPaper key={343} name={'Very long playlist name'} image={'https://via.placeholder.com/640'} uri={'test'} webUrl={'test2'}/>
  //       <CreatedPlaylistPaper key={123} name={'Test name'} image={'https://via.placeholder.com/640'} uri={'test'} webUrl={'test2'}/>
  //       <CreatedPlaylistPaper key={345} name={'Second playlist'} image={'https://via.placeholder.com/640'} uri={'test'} webUrl={'test2'}/>
  //     </div>
  //   </Box>
  // });

  const [isLoading, setIsLoading] = useState(false);

  const playlistTracksLimit = 10000;

  const isTrackAlreadyAdded = useCallback((trackData) => {
    const savedTracks = spotifyData.tracks;
    const trackArtists = trackData.artists.map(a => a.id);

    return savedTracks.some(track => (
      track.id === trackData.id || (track.name === trackData.name && track.artists.every(artist => trackArtists.includes(artist.id)))
    ))
  }, [spotifyData.tracks])

  const addTracksToPlaylist = useCallback(async (tracks) => {
    if (!tracks.length) {
      return Promise.reject('No new tracks found with the current configuration! Try to adjust some values');
    }
    const addLimit = 100;

    const splitArrayIntoPacks = (data, itemsPerPack) => {
      let dataToProceed = [...data];
      let resultingArray = [];

      while (dataToProceed.length > 0) {
        resultingArray.push(dataToProceed.splice(0, itemsPerPack));
      }

      return resultingArray;
    }

    // since spotify API is limited to 50 tracks per 1 add request
    let tracksPacks = splitArrayIntoPacks(tracks, addLimit);

    // since spotify API is limited to 10000 tracks per 1 playlist
    let playlistPacks = splitArrayIntoPacks(tracksPacks, playlistTracksLimit / addLimit);

    const createPlaylistRequest = async (playlistPack, name) => {
      // extra retries for playlist creation, since it's vital for the process
      const createPlaylist = async (playlistName, retryCounter = 1) => {
        try {
          return await axios.post(`/users/${spotifyUserId}/playlists`, {
            'name': name,
            'description': `Created with ${document.title} (${window.location.href})`
          });
        } catch {
          if (retryCounter >= 3) {
            throw Error(`Can't create playlist ${name} after ${retryCounter} retries`);
          } else {
            await createPlaylist(playlistName, retryCounter+1)
          }
        }
      }

      const createdPlaylist = await createPlaylist(name);

      const addTracksRequest = async (playlistId, tracksUris) => {
        const addedTracks = await axios.post(`/playlists/${playlistId}/tracks`, { uris: tracksUris });
        incrementProgress();
        return addedTracks;
      }

      const addTracksRequests = [];

      playlistPack.forEach(tracksUris => {
        addTracksRequests.push(addTracksRequest(createdPlaylist.data.id, tracksUris));
      })

      setTotalProgress(addTracksRequests.length, 13)

      await allSettledRequests(addTracksRequests);
      return createdPlaylist.data.id;
    }

    const createPlaylistRequests = [];

    playlistPacks.forEach((playlistPack, ind) => {
      createPlaylistRequests.push(createPlaylistRequest(playlistPack, `${configData.newPlaylistName} ${ind > 0 ? `(part ${ind + 1})` : ''}`))
    })

    return await allSettledRequests(createPlaylistRequests);
  }, [configData, spotifyUserId])

  const fetchArtistsTopTracks = useCallback(async (artistsArr) => {
    if (!artistsArr.length) {
      return Promise.reject('No artists found with the current configuration! Try to adjust some values');
    }

    const fetchTopTracksReq = async (artist) => {
      const artistTopTracks = await axios.get(`/artists/${artist}/top-tracks?market=from_token`);
      incrementProgress();

      let newTracks = [];

      artistTopTracks.data.tracks.some(track => {
        // Semantic check by name and artist, not just id inclusion
        if (!isTrackAlreadyAdded(track)) {
          newTracks.push(track.uri);
        }

        return newTracks.length === configData.targetQuantityPerArtist;
      })

      return newTracks;
    }

    let requestsArray = [];
    artistsArr.forEach(a => {
      // prevent adding the same artist more than once (which could already exist in another pack)
      if (!addedArtists.includes(a)) {
        requestsArray.push(fetchTopTracksReq(a));
        setAddedArtists(data => {
          data.push(a);
          return data;
        });
      }
    })

    setTotalProgress(requestsArray.length, configData.viewedMode === modeTypes.DIVE_DEEPER ? 40 : 60);

    return await allSettledRequests(requestsArray);
  }, [configData, addedArtists, isTrackAlreadyAdded])

  const fetchRelatedArtists = useCallback(async (artistsArr) => {
    if (!artistsArr.length) {
      return Promise.reject('No related artists found with the current configuration! Try to adjust some values');
    }

    const fetchRelatedArtistsReq = async (artist) => {
      const relatedArtists = await axios.get(`/artists/${artist}/related-artists`);

      incrementProgress();
      let newArtists = [];

      // Get only first X depending on config value
      relatedArtists.data.artists.some(relatedArtist => {
        const libraryArtists = spotifyData.artists.map(a => a.id);
        if (!libraryArtists.includes(relatedArtist.id)) {
          newArtists.push(relatedArtist.id);
        }
        return newArtists.length === configData.relatedArtistsQuantity;
      })

      return newArtists;
    }

    let requestsArray = artistsArr.map(artist => fetchRelatedArtistsReq(artist));

    setTotalProgress(requestsArray.length, 20);
    return await allSettledRequests(requestsArray);
  }, [configData, spotifyData.artists])

  const fetchPlaylistTracks = useCallback(async (playlistId) => {
    const targetUrl = playlistId === 0 ? '/me/tracks' : `/playlists/${playlistId}/tracks`;

    let totalPages = await axios.get(`${targetUrl}?market=from_token&limit=${1}`);
    totalPages = Math.ceil(totalPages.data.total / 50) + 1;

    resetProgress();
    setTotalProgress(totalPages, 25);

    const fetchedTracks = await synchFetchMultiplePages(targetUrl, 50, items => {
      incrementProgress();
      let newTracks = [];
      items.forEach(track => {
        track = track.track

        // Add only saved songs to result from non-library playlist
        if (playlistId === 0 || isTrackAlreadyAdded(track)) {
          newTracks.push({
            id: track.id,
            name: track.name,
            artists: track.artists.map(a => ({
              name: a.name,
              id: a.id
            }))
          });
        }
      })
      return newTracks;
    });

    let artists = new Map();

    fetchedTracks.forEach(t => {
      t.artists.forEach(a => {
        const foundArtist = artists.get(a.id);

        if (foundArtist) {
          foundArtist.ctr++;
        } else {
          artists.set(a.id, {
            name: a.name,
            ctr: 1
          })
        }
      })
    })

    // sort artists by ctr DESC
    artists = [...artists.entries()].sort((a, b) => {
      return b[1].ctr - a[1].ctr
    }).reduce((acc, cur) => {
      const artist = {
        id: cur[0],
        name: cur[1].name,
        ctr: cur[1].ctr
      };

      acc.push(artist)
      return acc;
    }, [])

    const mappedTracks = fetchedTracks.map(t => ({
      id: t.id,
      name: t.name,
      artists: t.artists.map(a => a.id)
    }));

    return {
      tracks: mappedTracks,
      artists: artists
    }
  }, [isTrackAlreadyAdded])

  const showPlaylistsResultModal = useCallback(async (playlistIds) => {
    if (!playlistIds.length) {
      return Promise.reject(`Error occured while creating playlist. Please try again`);
    }

    const playlistRequest = async (id) => {
      let playlistData = await axios.get(`/playlists/${id}`);
      incrementProgress();

      playlistData = playlistData.data;
      return {
        id: playlistData.id,
        image: playlistData.images[0] ? playlistData.images[0].url : null,
        name: playlistData.name,
        uri: playlistData.uri,
        webUrl: playlistData.external_urls.spotify
      }
    }

    const requestsArr = playlistIds.map(id => playlistRequest(id));
    setTotalProgress(requestsArr.length, 2);

    const playlists = await allSettledRequests(requestsArr);

    let playlistsCards = null;

    if (playlists.length) {
      playlistsCards = playlists.map(p => (
        <CreatedPlaylistPaper key={p.id} name={p.name} image={p.image} uri={p.uri} webUrl={p.webUrl}/>
      ))

      playlistsCards = <div className={classes.ModalPlaylists}>
        {playlistsCards}
      </div>
    }

    const modalContent = <Box className={classes.ModalContentContainer}>
      <Typography variant='h3'>Enjoy your new playlist{playlistIds.length > 1 ? 's' : ''}!</Typography>
      {playlistsCards}
    </Box>

    setModal({
      isVisible: true,
      content: modalContent
    })
  }, [classes])

  const executeProcess = useCallback(async () => {
    let targetArtists = [...spotifyData.artists];

    if (configData.selectedPlaylist !== 0) {
      targetArtists = (await fetchPlaylistTracks(configData.selectedPlaylist)).artists;
    } else {
      // if default playlist is already fetched - we will just reset progress to 25%, which will be seamless
      resetProgress();
      setTotalProgress(1, 25);
      incrementProgress();
    }
    setStepCompleted(processSteps.FETCH_PLAYLIST_TRACKS.id);

    // artists array is already sorted, so we remove all elements below the threshold
    for (let i=0; i < targetArtists.length; i++) {
      const artist = targetArtists[i];

      if (artist.ctr < configData.artistTracksThreshold) {
        targetArtists.splice(i, targetArtists.length)
        break;
      }
    }

    targetArtists = targetArtists.map(a => a.id);
    setStepCompleted(processSteps.SELECT_ARTISTS_FROM_PLAYLIST.id);

    if (configData.viewedMode === modeTypes.DIVE_DEEPER) {
      targetArtists = await fetchRelatedArtists(targetArtists);
      setStepCompleted(processSteps.FETCH_RELATED_ARTISTS.id);
    }

    const tracksToAdd = await fetchArtistsTopTracks(targetArtists);
    setStepCompleted(processSteps.FETCH_ARTIST_TOP_TRACKS.id);

    const createdPlaylists = await addTracksToPlaylist(tracksToAdd);
    setStepCompleted(processSteps.ADD_TRACKS_TO_PLAYLIST.id);

    await showPlaylistsResultModal(createdPlaylists);
    return;
  }, [
    addTracksToPlaylist,
    configData,
    fetchArtistsTopTracks,
    fetchPlaylistTracks,
    fetchRelatedArtists,
    setStepCompleted,
    spotifyData.artists,
    showPlaylistsResultModal
  ])

  const handleProcessFinished = useCallback(() => {
    setIsLoading(false);
    resetProgress();
    setAddedArtists([]);
    reenableConfigurator();
  }, [reenableConfigurator])

  const initiateProcess = useCallback(() => {
    if (!isAuth || isLoading) { return }

    setIsLoading(true);
    disableConfigurator();

    if (!spotifyData.fetch.finished) {
      spotifyDataDispatch({
        type: spotifyDataActions.PENDING_FETCH
      })
      return;
    }

    executeProcess()
      .finally(() => {
        handleProcessFinished();
      })
      .catch(error => {
        errorMessage(error);
      })

  }, [
      errorMessage,
      isAuth,
      disableConfigurator,
      isLoading,
      executeProcess,
      spotifyData.fetch.finished,
      handleProcessFinished
    ])

  // Get user info
  useEffect(() => {
    if (!isAuth) { return }
    axios.get('/me')
      .then(res => {
        setSpotifyUserId(res.data.id);
      })
      .catch((error) => {
        errorMessage(error)
      })
  }, [isAuth, errorMessage])

  // Get all user playlists
  useEffect(() => {
    if (!isAuth) { return }
    synchFetchMultiplePages('/me/playlists', 50, items =>
      items.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        tracksTotal: playlist.tracks.total
      }))
    ).then(playlists => {
      setPlaylists(playlists)
    })
    .catch((error) => {
      errorMessage(error);
    })
  }, [setPlaylists, isAuth, errorMessage])

  // Get all tracks from the library
  useEffect(() => {
    if (!isAuth) { return }
    if (spotifyData.fetch.finished) {
      return;
    }

    fetchPlaylistTracks(0)
      .then((playlistData) => {
        spotifyDataDispatch({
          type: spotifyDataActions.FINISHED_FETCH,
          tracks: playlistData.tracks,
          artists: playlistData.artists
        })
      })
      .catch((error) => {
        errorMessage(error);
      })
  }, [fetchPlaylistTracks, isAuth, spotifyData.fetch.finished, errorMessage])

  // Start process if it was initiated while fetching library
  useEffect(() => {
    if (spotifyData.fetch.pending && spotifyData.fetch.finished) {
      spotifyDataDispatch({type: spotifyDataActions.FINISHED_PENDING});
      executeProcess()
        .finally(() => {
          handleProcessFinished();
        })
        .catch(error => {
          errorMessage(error);
        })
    }
  }, [spotifyData.fetch, executeProcess, reenableConfigurator, handleProcessFinished, errorMessage])

  // Recalculate tracks count with each config change
  useEffect(() => {
    if (!isAuth || !spotifyData.fetch.finished || isLoading) { return }

    let artistsCtr = 0;
    spotifyData.artists.some((a) => {
      if (a.ctr < configData.artistTracksThreshold) {
        return true;
      } else {
        artistsCtr++;
        return false;
      }
    })

    if (configData.viewedMode === modeTypes.DIVE_DEEPER) {
      artistsCtr *= configData.relatedArtistsQuantity;
    }

    setRecalculatedTracks(artistsCtr * configData.targetQuantityPerArtist);
  }, [
    configData,
    spotifyData.fetch.finished,
    spotifyData.artists,
    isAuth,
    setRecalculatedTracks,
    isLoading
  ])

  const getSubmitButtonText = useMemo(() => {
    if (!isAuth) {
      return 'Login to proceed'
    } else {
      if (isLoading) {
        return 'In progress...'
      } else {
        return 'Start Process'
      }
    }
  }, [isAuth, isLoading])

  return (
    <Box className={classes.root}>
      { isLoading ? <LinearProgress variant="determinate" value={progress.current * 100} /> : null }
      <Button
        className={classes.Button}
        size="large"
        variant="contained"
        disabled={(isAuth && !props.isSubmitEnabled) || isLoading}
        onClick={isAuth ? initiateProcess : login}
      >
        {getSubmitButtonText}
      </Button>
      <Dialog
        className={classes.Modal}
        open={modal.isVisible}
        onClose={closeModal}
        fullWidth
        maxWidth='md'
        TransitionComponent={ModalTransition}
      >
        {modal.content}
        <DialogActions className={classes.ModalActions}>
          <Button variant="text" size="large" onClick={closeModal}>Continue Exploring</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

Loader.propTypes = {
  configData: PropTypes.object,
  setPlaylists: PropTypes.func.isRequired,
  setRecalculatedTracks: PropTypes.func.isRequired,
  reenableConfigurator: PropTypes.func.isRequired,
  disableConfigurator: PropTypes.func.isRequired,
  setStepCompleted: PropTypes.func.isRequired,
  isSubmitEnabled: PropTypes.bool.isRequired
}

export default Loader;
