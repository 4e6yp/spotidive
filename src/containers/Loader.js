import React, { useState, useEffect, useCallback } from 'react';
import * as processTypes from '../utility/processTypes';
import * as modeTypes from '../utility/modeTypes';
import PropTypes, { array } from 'prop-types'; 
import axios from '../axios-spotifyClient';
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
import { CircularProgress, Typography, Container } from '@material-ui/core';

axiosRetry(axios, {
  retries: 5,
  retryCondition: e => {
    return isNetworkOrIdempotentRequestError(e) || `${e.response.status}`[0] === "5" || e.response.status === 429
  },
  retryDelay: () => 3000
})

const wait = async (ms) => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  })
}

let requestsCounter = 0;
const requestsLimit = 50;
let cooldown = 4000;

axios.interceptors.request.use(async req => {
  requestsCounter++;

  if (requestsCounter > requestsLimit) {
    const cooldownMultiplier = Math.floor(requestsCounter / requestsLimit);
    await wait(cooldown * cooldownMultiplier);

    // reset counter when all queued requests are finished
    requestsCounter = requestsCounter - 1 === requestsLimit ? 0 : requestsCounter - 1;    
    return req;
  } else {
    return req;
  }
})

export const loadingStates = {
  IN_PROGRESS: 'IN_PROGRESS',
  ERROR: 'ERROR',
  FINISHED: 'FINISHED'
}

const Loader = (props) => {
  const { setPlaylists, configData } = props;

  const [spotifyData, setSpotifyData] = useState({
    library: {
      tracks: [],
      artists: {},
      finishedFetch: false
    },
    userId: null
  });

  const [addedArtists, setAddedArtists] = useState([]);

  const [error, setError] = useState(null);

  const [progress, setProgress] = useState(0);

  const [currentProcess, setCurrentProcess] = useState(processTypes.FETCH_LIBRARY_TRACKS);

  const [loadingState, setLoadingState] = useState();
  
  const [isLoading, setIsLoading] = useState(false);

  const [calculatedTracksCount, setCalculatedTracksCount] = useState(null);

  const playlistTracksLimit = 10000;

  /*
    Marker is contextual and depends on current process:
    FETCH_PLAYLIST_TRACKS    - offset for previous packet
    FETCH_ARTIST_TOP_TRACKS    - artistId
    FETCH_RELATED_ARTISTS    - artistId
    ADD_TRACKS_TO_PLAYLIST    - trackId
  */
  // const [continueProcessMarker, setContinueProcessMarker] = useState();

  const allSettledRequests = async (requestsArr) => {
    let allRequestsData = await Promise.allSettled(requestsArr);

    allRequestsData = allRequestsData.reduce((acc, cur) => {
      if (cur.status === 'fulfilled') {
        if (Array.isArray(cur.value)) {
          acc = acc.concat([...cur.value]);
        } else {
          acc.push(cur.value);
        }
      }
      return acc;
    }, []);
    return allRequestsData;
  }

  /**
   * perRequestFunction gets request response as input and should return object.
   * 
   * finishedFunciton gets array of processed objects (from each request) after all requests are finished. Should return object.
   */
  const synchFetchMultiplePages = useCallback(async (url, limit, perRequestFunction) => {
    const firstPage = await axios.get(`${url}?market=from_token&limit=${limit}`);    
    const firstPageData = perRequestFunction(firstPage.data.items);

    if (!firstPage.data.next) {
      return firstPageData;
    }

    const totalPagesNum = Math.ceil(firstPage.data.total / limit);

    const fetchPageData = async (currentOffset) => {
      const requestData = await axios.get(`${url}?market=from_token&limit=${limit}&offset=${currentOffset}`);
      return perRequestFunction(requestData.data.items);
    }

    let dataRequests = [];

    for (let i=limit; i <= totalPagesNum * limit; i += limit) {
      dataRequests.push(fetchPageData(i));
    }
    
    const allPagesData = await allSettledRequests(dataRequests, firstPageData);
    return firstPageData.concat(allPagesData);
  }, [])

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
      const createdPlaylist = await axios.post(`/users/${spotifyData.userId}/playlists`, {
        'name': name,
        'description': `Created with ${document.title} (${window.location.href})`
      });

      const addTracksRequest = async (playlistId, tracksUris) => {
        return await axios.post(`/playlists/${playlistId}/tracks`, { uris: tracksUris });
      }
      
      const addTracksRequests = [];
      
      playlistPack.forEach(tracksUris => {
        addTracksRequests.push(addTracksRequest(createdPlaylist.data.id, tracksUris));
      })
      
      await allSettledRequests(addTracksRequests);
      return createdPlaylist.data.id;
    }

    const createPlaylistRequests = [];

    playlistPacks.forEach((playlistPack, ind) => {
      createPlaylistRequests.push(createPlaylistRequest(playlistPack, `${configData.newPlaylistName} ${ind > 0 ? `(part ${ind + 1})` : ''}`))
    })

    return await allSettledRequests(createPlaylistRequests);
  }, [configData, spotifyData.userId])

  const fetchArtistsTopTracks = useCallback(async (artistsArr) => {
    if (!artistsArr.length) {
      return [];
    }

    const fetchTopTracksReq = async (artist) => {
      const artistTopTracks = await axios.get(`/artists/${artist}/top-tracks?market=from_token`);

      let newTracks = [];
                 
      artistTopTracks.data.tracks.some(track => {
        // Semantic check by name and artist, not just id inclusion                          
        if (!spotifyData.library.tracks.includes(track.id)) {
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

    return await allSettledRequests(requestsArray);
  }, [spotifyData.library, configData, addedArtists])

  const fetchRelatedArtists = useCallback(async (artistsArr) => {
    if (!artistsArr.length) {
      return [];
    }

    const fetchRelatedArtistsReq = async (artist) => {
      const relatedArtists = await axios.get(`/artists/${artist}/related-artists`);

      let newArtists = [];

      // Get only first X depending on config value
      relatedArtists.data.artists.some(relatedArtist => {
        const libraryArtists = spotifyData.library.artists.map(a => a.id);
        if (!libraryArtists.includes(relatedArtist.id)) {
          newArtists.push(relatedArtist.id);
        }
        return newArtists.length === configData.relatedArtistsQuantity;
      })

      return newArtists;
    }

    let requestsArray = artistsArr.map(artist => fetchRelatedArtistsReq(artist));

    return await allSettledRequests(requestsArray);
  }, [configData, spotifyData.library.artists])

  const fetchPlaylistTracks = useCallback(async (playlistId) => {
    const targetUrl = playlistId === 0 ? '/me/tracks' : `/playlists/${playlistId}/tracks`;

    const fetchedTracks = await synchFetchMultiplePages(targetUrl, 50, items => {
      let newTracks = [];
      items.forEach(track => {
        track = track.track

        // Add only saved songs to result from non-library playlist
        if (playlistId === 0 || spotifyData.library.tracks.includes(track.id)) {        
          newTracks.push({
            id: track.id,
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

    const mappedTracks = fetchedTracks.map(t => t.id);

    return {
      tracks: mappedTracks,
      artists: artists
    }
  }, [synchFetchMultiplePages, spotifyData.library.tracks])

  const initiateProcess = useCallback(async () => {
    setIsLoading(true);

    try {
      let targetArtists = [...spotifyData.library.artists];

      if (configData.selectedPlaylist !== 0) {
        targetArtists = (await fetchPlaylistTracks(configData.selectedPlaylist)).artists;
        console.log("TEST", targetArtists);
      }

      // artists array is already sorted, so we remove all elements below the threshold
      for (let i=0; i < targetArtists.length; i++) {
        const artist = targetArtists[i];
  
        if (artist.ctr < configData.artistTracksThreshold) {
          targetArtists.splice(i, targetArtists.length)
          break;
        }
      }
      
      targetArtists = targetArtists.map(a => a.id);
      
      if (!targetArtists.length) {
        setError('No artists found with current configuration! Try to adjust some values');
        return;
      }

      if (configData.selectedMode === modeTypes.DIVE_DEEPER) {
        targetArtists = await fetchRelatedArtists(targetArtists);
      }

      const tracksToAdd = await fetchArtistsTopTracks(targetArtists);

      // return created playlists data here
      // and show it in popup with links

      // also disable and reenable buttons on configurator. And fix BS with insta-starting a new process
      addTracksToPlaylist(tracksToAdd)
        .then(data => {
          console.log(data);
        })     
    } catch (error) {
      // test it
      setError(error);
    }
  }, [spotifyData.library.artists, configData, fetchArtistsTopTracks, fetchPlaylistTracks, addTracksToPlaylist, fetchRelatedArtists])

  // Get user info
  useEffect(() => {
    axios.get('/me')
      .then(res => {
        setSpotifyData(data => ({
          ...data,
          userId: res.data.id
        }))
      })
      .catch(() => {
        setError();
      })
  }, [])

  // Get all user playlists
  useEffect(() => {
    synchFetchMultiplePages('/me/playlists', 50, items => 
      items.map(playlist => ({ 
        id: playlist.id,
        name: playlist.name,          
        tracksTotal: playlist.tracks.total
      }))
    ).then(playlists => {
      setPlaylists(playlists)});
  }, [setPlaylists, synchFetchMultiplePages])

  // Get all tracks from the library
  useEffect(() => {
    if (spotifyData.library.finishedFetch) {
      return;
    }

    fetchPlaylistTracks(0)
      .then((playlistData) => {
        setSpotifyData(data => ({
          ...data,
          library: {
            tracks: playlistData.tracks,
            artists: playlistData.artists,
            finishedFetch: true
          }
        }))
      })
      .catch(() => {
        setError();
      })
  }, [fetchPlaylistTracks, spotifyData.library.finishedFetch])

  // Initiate currently selected process (only if library already fetched)
  // Recalculate tracks count with each config change
  useEffect(() => {
    if (!spotifyData.library.finishedFetch) {
      return;
    }

    let artistsCtr = 0;
    spotifyData.library.artists.some((a) => {
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

    setCalculatedTracksCount(artistsCtr * configData.targetQuantityPerArtist);    

    if (configData.selectedMode) {
      initiateProcess()
        .finally(() => {
          setIsLoading(false);
        })
    }
  }, [configData, initiateProcess, spotifyData.library])

  
  useEffect(() => {
    if (!spotifyData.library.finishedFetch) {
      return;
    }


  }, [spotifyData.library, configData])

  return (
    <Container>
      { isLoading ? <CircularProgress /> : null }
      { !calculatedTracksCount || configData.selectedPlaylist !== 0 ? null : // add calculate btn here for non library playlists
        <Typography variant="subtitle1" align="center" color="textSecondary" component="p">
          {calculatedTracksCount <= playlistTracksLimit ? 'Playlist' : 
            `${Math.ceil(calculatedTracksCount / playlistTracksLimit)} playlists`} with total of {calculatedTracksCount} tracks (max) will be created
        </Typography>
      }
    </Container>
  );
}

Loader.propTypes = {
  configData: PropTypes.object,
  setPlaylists: PropTypes.func.isRequired
}

export default Loader;
