export const messageActions = {
  SHOW_SUCCESS_MESSAGE: 'SHOW_SUCCESS_MESSAGE',
  SHOW_ERROR_MESSAGE: 'SHOW_ERROR_MESSAGE',
  HIDE_MESSAGE: 'HIDE_MESSAGE'
}

export const messageReducer = (state, action) => {
  switch (action.type) {
    case messageActions.SHOW_SUCCESS_MESSAGE:
      return {
        ...state,
        isVisible: true,
        text: action.text,
        alertType: 'success'
      }
    
    case messageActions.SHOW_ERROR_MESSAGE:
      if (state.text === action.text && state.isVisible && state.alertType === 'error') {
        return state;
      }
      
      return {
        ...state,
        isVisible: true,
        text: action.text,
        alertType: 'error'
      }

    case messageActions.HIDE_MESSAGE:
      return {
        ...state,
        isVisible: false
      }
  
    default:
      throw Error(`Unknown action type "${action.type}"`);
  }
}