import * as storeUtils from './storeUtils'
import * as modules from '.'

const initialState = {}
const rootReducer = storeUtils.createRootReducer(modules)
const rootSaga = storeUtils.createRootSaga(modules)

const store = storeUtils.createPersistedStore(
    rootReducer,
    rootSaga,
    initialState,
)

export default store;
