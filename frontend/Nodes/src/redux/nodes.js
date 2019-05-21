import { takeEvery, put, call } from 'redux-saga/effects'
import { get, isEmpty } from 'lodash'

import api from './api'

export const NODES_DATA_REQUESTED = '@ nodes / NODES_DATA_REQUESTED'
export const NODES_DATA_FETCHED   = '@ nodes / NODES_DATA_FETCHED'

//
// ACTIONS

export const requestNodesData = () => ({ type: NODES_DATA_REQUESTED })

//
// REDUCER

const initialState = {
    created   : new Date(),
    updated   : new Date(),
    nodesData : {}
}

export function reducer(state = initialState, action = {}) {
    switch (action.type) {
        case NODES_DATA_FETCHED:
            return {
                ...state,
                updated   : new Date(),
                nodesData : action.payload
            }
        default:
            return state
    }
}

//
// SAGAS

export function* saga() {
    yield takeEvery(NODES_DATA_REQUESTED, fetchNodesData)
}

function* fetchNodesData() {
    // const dummy_payload = {
    //     0: {
    //         name : 'node1',
    //         data : [{ sensor: 'temp', value: 20 }, { sensor: 'hum', value: 10 }]
    //     },
    //     1: {
    //         name : 'node2',
    //         data : [{ sensor: 'proximity', value: 100 }]
    //     }
    // }
    const nodesURL = api.buildURL('nodes')
    yield put(api.get(nodesURL))

    const response = yield call(api.waitForResponse, { url: nodesURL })
    if (!response) {
        return
    }

    const payload = get(response, 'payload.response.data')
    if (!isEmpty(payload)) {
        yield put({ type: NODES_DATA_FETCHED, payload })
    }
}
