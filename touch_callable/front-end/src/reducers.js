export function updateCallables(callables) {
  return {
    type: 'updateCallables',
    callables
  }
}


const initialState = {
  callables: []
}


function runCallableApp(state=initialState, action) {
  switch (action.type) {
    case 'updateCallables':
      return Object.assign({}, state, {
        callables: action.callables
      })
    default:
      return state
  }
}


export default runCallableApp
