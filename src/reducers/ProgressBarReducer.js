export const progressBarActions = {
  SET_TOTAL_PROGRESS: 'SET_TOTAL_PROGRESS',
  INCREMENT_PROGRESS: 'INCREMENT_PROGRESS',
  RESET_PROGRESS: 'RESET_PROGRESS'
}

export const progressBarReducer = (state, action) => {
  switch (action.type) {
    case progressBarActions.SET_TOTAL_PROGRESS:
      return {
        ...state,
        stepPercent: action.stepPercent,      
        total: action.total
      }
    
    case progressBarActions.INCREMENT_PROGRESS:
      const newProgress = state.current + ((1 / state.total) * (state.stepPercent / 100));
      // console.log(`
      //   ======================================
      //   Current: ${state.current}
      //   Total: ${state.total}
      //   StepPercent: ${state.stepPercent}
      //   New progress: ${newProgress}        
      // `)
      return {
        ...state,
        current: newProgress
      }

    case progressBarActions.RESET_PROGRESS:
      return {
        current: 0,
        total: 0,
        stepPercent: 0
      }
  
    default:
      throw Error(`Unknown action type "${action.type}"`);
  }
}