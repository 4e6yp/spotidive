export const spotifyDataActions = {
  PENDING_FETCH: 'PENDING_FETCH',
  FINISHED_PENDING: 'FINISHED_PENDING',
  FINISHED_FETCH: 'FINISHED_FETCH'
}

export const spotifyDataReducer = (state, action) => {
  switch (action.type) {
    case spotifyDataActions.PENDING_FETCH:
      return {
        ...state,
        fetch: {
          pending: true,
          finished: false
        }
      }
    
    case spotifyDataActions.FINISHED_FETCH:
      return {
        tracks: action.tracks,
        artists: action.artists,
        fetch: {
          ...state.fetch,
          finished: true
        }
      }

    case spotifyDataActions.FINISHED_PENDING:
      return {
        ...state,
        fetch: {
          ...state.fetch,
          pending: false
        }
      }
  
    default:
      throw Error(`Unknown action type "${action.type}"`);
  }
}