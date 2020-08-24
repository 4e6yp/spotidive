import React, { useState, useEffect, useCallback } from 'react';
import ProgressBar from '../components/ProgressBar';
import * as processTypes from '../utility/processTypes';
import * as modeTypes from '../utility/modeTypes';
import PropTypes, { array } from 'prop-types'; 
import axios from '../axios-spotifyClient';
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
import { CircularProgress } from '@material-ui/core';

axiosRetry(axios, {
  // FIXME bruteforce is not an option! 
  retries: 10,
  retryCondition: e => {
    return isNetworkOrIdempotentRequestError(e) || e.response.status === 429 || e.response.status === 500
  },
  // maybe handle delay correctly? depending on retry-after
  // retryDelay: axiosRetry.exponentialDelay
  retryDelay: () => 5000
})

export const loadingStates = {
  IN_PROGRESS: 'IN_PROGRESS',
  ERROR: 'ERROR',
  FINISHED: 'FINISHED'
}

const Loader = (props) => {
  const { setPlaylists, configData } = props;

  // Remove unnecessary fields (such as tracks to add);
  const [spotifyData, setSpotifyData] = useState({
    library: {
      tracks: [],
      artists: {},
      finishedFetch: false
    },
    playlist: {
      id: '',
      tracks: [],
      artists: {} // key = artistID
    },
    tracksToAdd: [],
    userId: null
  });

  const [progress, setProgress] = useState(0);

  const [currentProcess, setCurrentProcess] = useState(processTypes.FETCH_LIBRARY_TRACKS);

  const [loadingState, setLoadingState] = useState();
  
  const [isLoading, setIsLoading] = useState(false);

  /*
    Marker is contextual and depends on current process:
    FETCH_PLAYLIST_TRACKS - offset for previous packet
    FETCH_ARTIST_TOP_TRACKS - artistId
    FETCH_RELATED_ARTISTS - artistId
    ADD_TRACKS_TO_PLAYLIST - trackId
  */
  // const [continueProcessMarker, setContinueProcessMarker] = useState();

  /**
   * perRequestFunction gets request response as input and should return object.
   * 
   * finishedFunciton gets array of processed objects (from each request) after all requests are finished. Should return object.
   */
  const synchFetchMultiplePages = (url, perRequestFunction, finishedFunction) => {
    const limit = 50;

    axios.get(`${url}?market=from_token&limit=${limit}`)
      .then(res => {
        const initialRequestData = perRequestFunction(res.data.items);

        if (!res.data.next) {
          return finishedFunction(initialRequestData);
        }

        const totalPages = Math.ceil(res.data.total / limit);
        const fetchData = (currentOffset) => {
          return new Promise((resolve, reject) => {
            axios.get(`${url}?market=from_token&limit=${limit}&offset=${currentOffset}`)
              .then(res => {
                resolve(perRequestFunction(res.data.items));
              })
          })
        }

        let dataRequests = [];

        for (let i=limit; i <= totalPages * limit; i += limit) {
          dataRequests.push(fetchData(i));
        }

        Promise.allSettled(dataRequests)
          .then(data => {
            // Manually insert initial data, since it won't be proceeded inside our loop
            data.unshift({ status: 'fulfilled', value: initialRequestData });
            finishedFunction(data);
          })
      })
  }

  const addTracksToPlaylist = useCallback((tracks) => {
    const addLimit = 100;
    const playlistTracksLimit = 10000;

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

    const createPlaylistRequest = (playlistPack, name) => {
      return new Promise((resolvePlaylistCreate, rejectPlaylistCreate) => {
        axios.post(`/users/${spotifyData.userId}/playlists`, {
          'name': name,
          'description': `Created with ${document.title} (${window.location.href})`
        }).then(playlistData => {          
          playlistData = playlistData.data;

          const addTracksRequest = (playlistId, tracksUris) => {
            return new Promise((resolveAddTracks, rejectAddTracks) => {
              axios.post(`/playlists/${playlistId}/tracks`, {
                uris: tracksUris
              }).then(() => {
                resolveAddTracks(true);
              })
            })
          }
          
          const addTracksRequests = [];
          
          playlistPack.forEach(tracksUris => {
            addTracksRequests.push(addTracksRequest(playlistData.id, tracksUris));
          })

          Promise.allSettled(addTracksRequests)
            .then(() => {
              resolvePlaylistCreate(playlistData);
            })
        })
      })
    }

    const createPlaylistRequests = [];

    playlistPacks.forEach((playlistPack, ind) => {
      createPlaylistRequests.push(createPlaylistRequest(playlistPack, `${configData.newPlaylistName} ${ind > 0 ? `(part ${ind + 1})` : ''}`))
    })

    Promise.allSettled(createPlaylistRequests)
      .then((createdPlaylistsData) => {
        // Add popup here with playlist names and links
        console.log("PLAYLIST CREATION IS RESOLVED:", createdPlaylistsData);
        setIsLoading(false);
      })
    
    // do requests
  }, [configData, spotifyData.userId])

  const fetchArtistTopTracks = useCallback(() => {
    console.log('FETCH ARTIST TOP TRACKS');

    // selected playlist here
    const fetchTopTracks = (artist) => {
      return new Promise((resolve, reject) => {
        axios.get(`/artists/${artist}/top-tracks?market=from_token`)
          .then(res => {
            let newTracks = [];
                 
            res.data.tracks.forEach(track => {
              // Semantic check by name and artist, not just id inclusion                          
              if (!spotifyData.library.tracks.includes(track.id)) {
                newTracks.push(track.uri);
              }
            })
            resolve(newTracks);
          })
      })
    }

    let requestsArray = [];

    const targetPlaylistArtists = spotifyData.library.artists;    

    for (let i=0; i < targetPlaylistArtists.length; i++) {
      const artist = targetPlaylistArtists[i];

      if (artist.ctr < configData.artistTracksThreshold) {
        break;
      }

      requestsArray.push(fetchTopTracks(artist.id));
    }

    Promise.allSettled(requestsArray)
      .then(data => {
        const tracks = data.reduce((acc, cur) => {          
          return acc.concat(cur.value);
        },[]);

        addTracksToPlaylist(tracks);
      })

  }, [spotifyData.library, configData, addTracksToPlaylist])

  const fetchRelatedArtists = useCallback(() => {

    // do requests
  }, [])

  const fetchPlaylistTracks = useCallback((playlistId) => {
    if (playlistId === 0) {

      synchFetchMultiplePages('/me/tracks', 
      (items) => {
        let newTracks = [];
        items.forEach(track => {
          track = track.track
          newTracks.push({
            id: track.id,
            artists: track.artists.map(a => {
              return {
                name: a.name,
                id: a.id
              }
            })
          });
        })

        return newTracks;
      }, 
      (tracks) => {
        tracks = tracks.reduce((acc, cur) => cur.status === 'fulfilled' ? acc.concat([...cur.value]) : acc, []);

        // count songs by each artist
        let artists = {};

        tracks.forEach(t => {
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

        tracks = tracks.map(t => t.id);

        setSpotifyData(data => {
          return {
          ...data,
          library: {
            tracks: tracks,
            artists: artists,
            finishedFetch: true
          }
        }})

        // switch (configData.selectedMode) {
        //   case modeTypes.LOOK_CLOSER:
            
        //     break;
          
        //   case modeTypes.DIVE_DEEPER:
        //     fetchRelatedArtists()
        //     break;
        
        //   default:
        //     throw Error(`Unknown mode is selected ${configData.selectedMode}`)            
        // }
      })
    }
  }, [])

  const initiateProcess = useCallback(() => {
    // if (configData.selectedPlaylist !== 0) {
    // gotta think about it
    // }

    setIsLoading(true);
    fetchArtistTopTracks();
  }, [fetchArtistTopTracks])

  // Get user info
  useEffect(() => {
    // Use lodash here as well
    axios.get('/me')
      .then(res => {
        setSpotifyData(data => {
          return {
            ...data,
            userId: res.data.id
          }
        })
      })
  }, [])

  // Get all user playlists
  useEffect(() => {
    synchFetchMultiplePages('/me/playlists', 
    (items) => {
      return items.map(playlist => {
        return {
          id: playlist.id,
          name: playlist.name,          
          tracksTotal: playlist.tracks.total
        }
      })
    }, 
    (playlists) => {
      setPlaylists(playlists);
    })
  }, [setPlaylists])

  // Get all tracks from the library
  useEffect(() => {
    fetchPlaylistTracks(0);
  }, [fetchPlaylistTracks])

  // Initiate currently selected process (only if library already fetched)
  useEffect(() => {
    if (!spotifyData.library.finishedFetch) {
      return;
    }

    if (configData) {
      initiateProcess();
    }
  }, [configData, initiateProcess, spotifyData.library.finishedFetch])

  return (
    isLoading ? <CircularProgress /> : null
    //<ProgressBar progress={progress} loadingState={loadingState}/>
  );
}

Loader.propTypes = {
  configData: PropTypes.object,
  setPlaylists: PropTypes.func.isRequired
}

export default Loader;
