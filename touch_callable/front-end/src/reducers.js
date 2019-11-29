import enUS from 'antd/es/locale/en_US'

export function updateCallables (callables) {
  return {
    type: 'updateCallables',
    callables
  }
}

export function setLocale (locale) {
  return {
    type: 'setLocale',
    locale
  }
}

export function changeModuleStatus (hasNew) {
  return {
    type: 'changeModuleStatus',
    hasNew
  }
}

const initialState = {
  callables: [],
  locale: enUS,
  hasNewModule: false
}

function runCallableApp (state = initialState, action) {
  switch (action.type) {
    case 'updateCallables':
      return Object.assign({}, state, {
        callables: action.callables
      })
    case 'setLocale':
      return Object.assign({}, state, {
        locale: action.locale
      })
    case 'changeModuleStatus':
      return Object.assign({}, state, {
        hasNewModule: action.hasNew
      })
    default:
      return state
  }
}

export default runCallableApp
