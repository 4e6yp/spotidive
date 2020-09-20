import React, { useState, useEffect, useCallback, useReducer } from 'react';
import * as modeTypes from '../utility/modeTypes';
import PropTypes from 'prop-types'; 
import axios from '../axios-spotifyClient';
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
import { Typography, Container, Modal, Button } from '@material-ui/core';
import CreatedPlaylistPaper from '../components/CreatedPlaylistPaper';
import processSteps from '../utility/processSteps';
import { allSettledRequests, synchFetchMultiplePages } from '../utility/Loader'
import { spotifyDataActions, spotifyDataReducer } from '../utility/SpotifyReducer'
import ProgressBar from '../components/ProgressBar';

axiosRetry(axios, {
  retries: 5,
  retryCondition: e => {
    return isNetworkOrIdempotentRequestError(e) || `${e.response.status}`[0] === "5" || e.response.status === 429
  },
  retryDelay: (_, error) => {
    if (error.response.status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after']);
      return retryAfter ? (retryAfter * 1000) + 500 : 3000
    }    
    return 3000;
  }
})

const wait = async (ms) => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  })
}

let requestsCounter = 0;
const requestsLimit = 50;
let cooldown = 4000;

// Split requests into packs with delays in-between (due to api limitations)
axios.interceptors.request.use(async req => {
  requestsCounter++;

  if (requestsCounter > requestsLimit) {
    const cooldownMultiplier = Math.floor(requestsCounter / requestsLimit);
    await wait(cooldown * cooldownMultiplier);

    // reset counter when all queued requests are finished
    requestsCounter = requestsCounter - 1 === requestsLimit ? 0 : requestsCounter - 1;    
  }
  return req;
})

const Loader = (props) => {
  const { 
    setPlaylists, 
    configData, 
    showError, 
    setRecalculatedTracks, 
    isAuth,
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

  const [progress, setProgress] = useState({
    current: 0,
    total: 0
  })

  const setTotalProgress = (total) => {
    setProgress({
      current: 0,
      total: total
    })
  }

  const incrementProgress = () => {
    setProgress(progress => ({
      ...progress,
      current: progress.current + 1,      
    }))
  }

  const [addedArtists, setAddedArtists] = useState([]);

  const [modal, setModal] = useState({
    isVisible: false,
    content: <></>
  });
  
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
      
      setTotalProgress(addTracksRequests.length)

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
      return [];
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

    setTotalProgress(requestsArray.length);

    return await allSettledRequests(requestsArray);
  }, [configData, addedArtists, isTrackAlreadyAdded])

  const fetchRelatedArtists = useCallback(async (artistsArr) => {
    if (!artistsArr.length) {
      return [];
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

    setTotalProgress(requestsArray.length);
    return await allSettledRequests(requestsArray);
  }, [configData, spotifyData.artists])

  const fetchPlaylistTracks = useCallback(async (playlistId) => {
    setTotalProgress(null);
    const targetUrl = playlistId === 0 ? '/me/tracks' : `/playlists/${playlistId}/tracks`;

    const fetchedTracks = await synchFetchMultiplePages(targetUrl, 50, items => {
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

    let artists = {};

    fetchedTracks.forEach(t => {
      t.artists.forEach(a => {
        const foundArtist = artists[a.id];

        if (foundArtist) {
          foundArtist.ctr++;
        } else {
          artists[a.id] = {
            name: a.name,
            ctr: 1
          }
        }
      })
    })

    // sort artists by ctr DESC
    artists = Object.entries(artists).sort((a, b) => {
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
    const playlistRequest = async (id) => {
      let playlistData = await axios.get(`/playlists/${id}`);
      incrementProgress();
      
      playlistData = playlistData.data;
      return {
        id: playlistData.id,
        image: playlistData.images[0] ? playlistData.images[0].url : null,
        name: playlistData.name,
        uri: playlistData.uri,
        href: playlistData.href
      }
    }

    const requestsArr = playlistIds.map(id => playlistRequest(id));
    setTotalProgress(requestsArr.length);

    const playlists = await allSettledRequests(requestsArr);

    let modalContent = <Typography variant="h4">
      {playlistIds.length > 1 ? 'Playlist is' : `${playlistIds.length} playlists are`} created! Go and check it out!
    </Typography>

    if (playlists.length) {
      modalContent = playlists.map(p => (
        <CreatedPlaylistPaper key={p.id} name={p.name} image={p.image} uri={p.uri}/>
      ))
    }

    modalContent = <Container>
      {modalContent}
    </Container>

    setModal({
      isVisible: true,
      content: modalContent
    })
  }, [])

  const executeProcess = useCallback(async () => {
    let targetArtists = [...spotifyData.artists];

    if (configData.selectedPlaylist !== 0) {
      targetArtists = (await fetchPlaylistTracks(configData.selectedPlaylist)).artists;
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

    if (!targetArtists.length) {
      return Promise.reject('No artists found with current configuration! Try to adjust some values');
    }

    if (configData.viewedMode === modeTypes.DIVE_DEEPER) {
      targetArtists = await fetchRelatedArtists(targetArtists);
      setStepCompleted(processSteps.FETCH_RELATED_ARTISTS.id);
    }

    const tracksToAdd = await fetchArtistsTopTracks(targetArtists);
    setStepCompleted(processSteps.FETCH_ARTIST_TOP_TRACKS.id);

    if (!tracksToAdd.length) {
      return Promise.reject('No new tracks found with current configuration! Try to adjust some values');
    }

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
        setIsLoading(false);
        setAddedArtists([]);
        reenableConfigurator();
      })
      .catch(error => {
        showError(error)
      })

  }, [
      showError, 
      isAuth, 
      disableConfigurator,
      reenableConfigurator,
      isLoading,
      executeProcess,
      spotifyData.fetch.finished,
    ])

  // Get user info
  useEffect(() => {
    if (!isAuth) { return }
    axios.get('/me')
      .then(res => {
        setSpotifyUserId(res.data.id);
      })
      .catch(() => {
        showError()
      })
  }, [showError, isAuth])

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
    });
  }, [setPlaylists, isAuth])

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
      .catch(() => {
        showError();
      })
  }, [fetchPlaylistTracks, showError, isAuth, spotifyData.fetch.finished])

  // Start process if it was initiated while fetching library
  useEffect(() => {
    if (spotifyData.fetch.pending && spotifyData.fetch.finished) {
      spotifyDataDispatch({type: spotifyDataActions.FINISHED_PENDING});      
      executeProcess()
        .finally(() => {
          setIsLoading(false);
          setAddedArtists([]);
          reenableConfigurator();
        })
        .catch(error => {
          showError(error)
        })
    }
  }, [spotifyData.fetch, executeProcess, reenableConfigurator, showError])

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
  
  const startProccessBtn = props.isAuth
  ? <Button onClick={initiateProcess}>Start Process</Button>
  : <Button onClick={props.login}>Login to continue</Button>

  return (
    <Container>
      { isLoading ? <ProgressBar progress={progress.total !== null ? (progress.current / progress.total * 100) : null} /> : null }
      { startProccessBtn }
      <Modal 
        open={modal.isVisible} 
        onClose={() => setModal({
          isVisible: false,
          content: <></>
        })}
      >
        {modal.content}
      </Modal>
    </Container>
  );
}

Loader.propTypes = {
  configData: PropTypes.object,
  setPlaylists: PropTypes.func.isRequired,
  showError: PropTypes.func.isRequired,
  setRecalculatedTracks: PropTypes.func.isRequired,
  isAuth: PropTypes.bool.isRequired,
  reenableConfigurator: PropTypes.func.isRequired,
  disableConfigurator: PropTypes.func.isRequired,
  setStepCompleted: PropTypes.func.isRequired,
  login: PropTypes.func.isRequired
}

export default Loader;
