import { createStore as createReduxStore, combineReducers, applyMiddleware, compose } from 'redux'
import { createLogger } from 'redux-logger'

import createSagaMiddleware from 'redux-saga'

import { fork, all } from 'redux-saga/effects'

import { map, reduce, compact, has } from 'lodash'

export function createRootReducer(modules) {
    const reducers = reduce(modules, (acc, module, key) => {
        if (!has(module, 'reducer')) {
            return acc
        }
        return {
            ...acc,
            [key]: module.reducer
        }
    }, {})

    return combineReducers(reducers)
}

export function createRootSaga(modules) {
    const sagas = compact(map(modules, 'saga'))

    return function* rootSaga() {
        yield all(map(sagas, saga => fork(saga)))
    }
}

export function createStore(rootReducer, rootSaga, initialState = {}, customMiddleware = []) {
    const middleware = []
    const enhancers = []

    const logger = createLogger({
        level     : 'info',
        collapsed : true,
        timestamp : false,
        duration  : true
    })
    middleware.push(logger)

    const sagaMiddleware = createSagaMiddleware()
    middleware.push(sagaMiddleware)

    const store = createReduxStore(
        rootReducer,
        initialState,
        compose(
            applyMiddleware(...middleware, ...customMiddleware),
            ...enhancers
        )
    )

    sagaMiddleware.run(rootSaga)

    return store
}

export function createPersistedStore(rootReducer, rootSaga, initialState = {}, customMiddleware = []) {
    const store = createStore(rootReducer, rootSaga, initialState, customMiddleware)
    return store
}
