import axios from 'axios'
import URI from 'urijs'
import { compile, parse } from 'path-to-regexp'
import { matchPath } from 'react-router'
import md5 from 'md5'

import { takeEvery, take, call, put, race, all, cancel, delay } from 'redux-saga/effects'
import { channel } from 'redux-saga'

import { normalize, schema } from 'normalizr'

import { createSelector } from 'reselect'

import {
    map, reduce, forEach, get as _get, replace, size, keys, find, max,
    compact, flatten, uniq, join, omit, omitBy, findKey, head, snakeCase, toUpper,
    has, includes, isString, isObject, isArray, isEmpty, isNil, pick, toInteger, flatMap, sortBy, ceil
} from 'lodash'

import { API_REQUEST_TIMEOUT } from '../settings'

export default (baseURL, { endpoints = {}, mappings = {}, options = {} }) => {
    const ACTIONS = ['get', 'create', 'update', 'destroy',  'upload']
    const STATES = {
        requested : 'requested',
        succeeded : 'succeeded',
        failed    : 'failed'
    }
    const METHODS = {
        create  : 'POST',
        update  : 'PATCH',
        destroy : 'DELETE',
        get     : 'GET'
    }

    const resources = reduce(endpoints, (acc, endpoint, name) => {
        const resource = createResource(name, endpoint)
        return {
            ...acc,
            [resource.name]: resource
        }
    }, {})


    //
    //  ACTIONS

    const REQUESTED          = '@ api / REQUESTED'
    const SUCCEEDED          = '@ api / SUCCEEDED'
    const FAILED             = '@ api / FAILED'
    const DOWNLOAD_REQUESTED = '@ api / DOWNLOAD_REQUESTED'
    const DOWNLOAD_SUCCEEDED = '@ api / DOWNLOAD_SUCCEEDED'
    const DOWNLOAD_FAILED    = '@ api / DOWNLOAD_FAILED'

    const create = (url, data) => ({
        type    : REQUESTED,
        payload : { url: buildURL(url), data, method: METHODS.create }
    })

    const update = (url, data) => ({
        type    : REQUESTED,
        payload : { url: buildURL(url), data, method: METHODS.update }
    })

    const get = (url, params = {}) => ({
        type    : REQUESTED,
        payload : { url: buildURL(url, params), method: METHODS.get }
    })

    const destroy = (url, params = {}) => ({
        type    : REQUESTED,
        payload : { url: buildURL(url, params), method: METHODS.destroy }
    })

    const upload = (url, data) => ({
        type    : REQUESTED,
        payload : {
            url    : buildURL(url),
            data   : buildFormData(data),
            method : METHODS.update,
            config : { headers: { 'Content-Type': 'multipart/form-data' } }
        }
    })

    const download = (url, params = {}, filename, options = {}) => ({
        type    : DOWNLOAD_REQUESTED,
        payload : { url: buildURL(url, params), filename, options }
    })

    const http = axios.create({
        baseURL,
        timeout : API_REQUEST_TIMEOUT,
        headers : {
            'Content-Type'     : 'application/json',
            'Accept'           : 'application/json',
            'X-Requested-With' : 'XMLHttpRequest'
        }
    })


    //
    //  SAGA

    function* saga() {
        yield takeEvery(REQUESTED, performRequest)
        yield takeEvery([REQUESTED, FAILED, SUCCEEDED], emitResourceSpecificActions)
    }

    function* performRequest({ payload }) {
        const { url, method, data, config } = payload

        try {
            const response = yield call(http.request, { method, url, data, config })
            yield put({ type: SUCCEEDED, payload: { url, method, response } })
        } catch (exception) {
            if (isNetworkError(exception)) {
                const { response } = exception
                const error = parseErrors(exception)
                yield put({ type: FAILED, payload: { url, method, response, error } })
            } else if (isTimeoutError(exception)) {
                const response = null
                const error = exception
                yield put({ type: FAILED, payload: { url, method, response, error } })
            } else throw exception
        }
    }

    function* waitForResponse({ url, timeout = 10000 }) {
        const successfulRequests = channel()
        const failedRequests = channel()
        const watchForSuccessfulRequests = yield takeEvery(SUCCEEDED, function* checkURL(action) {
            if (action.payload.url === url) {
                yield put(successfulRequests, action)
            }
        })

        const watchForFailedRequests = yield takeEvery(FAILED, function* checkURL(action) {
            if (action.payload.url === url) {
                yield put(failedRequests, action)
            }
        })

        const { success } = yield race({
            success : take(successfulRequests),
            failure : take(failedRequests),
            timeout : delay(timeout)
        })

        yield cancel(watchForSuccessfulRequests)
        yield cancel(watchForFailedRequests)
        successfulRequests.close()
        failedRequests.close()

        return success || null
    }

    function* emitResourceSpecificActions({ type, payload }) {
        const { url, method } = payload
        const resourceName = parseURL(url).resource
        const resource = getResource(resourceName)

        if (!resource) {
            return
        }

        const action = findKey(METHODS, (m) => m === method)
        switch (type) {
            case REQUESTED:
                yield put({
                    type    : resource[actionDescriptor(action, 'requested')],
                    payload : { url }
                })
                break

            case SUCCEEDED: {
                const { response } = payload
                const meta = pick(response.data, ['count', 'page_size'])
                const { entities } = normalizeResponseWithSchema(
                    response.data,
                    resource.schema
                )

                const resourcesInResponse = uniq(compact(flatten([resourceName, keys(entities)])))
                const resources = action !== 'update'
                    ? map(resourcesInResponse, getResource)
                    : [resource]

                yield all(map(resources, (resource) => put({
                    type    : resource[actionDescriptor(action, 'succeeded')],
                    payload : { url, meta, data: _get(entities, resource.name, {}) }
                })))

                break
            }


            case FAILED: {
                const { error } = payload
                yield put({
                    type    : resource[actionDescriptor(action, 'failed')],
                    payload : { url, error }
                })
                break
            }

            default:
                break
        }
    }

    //
    //   REDUCER

    const initialState = {
        pendingRequests: {
            global: 0
        }
    }

    function reducer(state = initialState, action = {}) {
        switch (action.type) {
            case REQUESTED: {
                const { url, method } = action.payload
                if (method !== METHODS.get) {
                    return state
                }

                const { resource } = parseURL(url)
                const keys = compact(['global', url, resource])

                return {
                    ...state,
                    pendingRequests: reduce(keys, (acc, key) => ({
                        ...acc,
                        [key]: _get(acc, key, 0) + 1
                    }), state.pendingRequests)
                }
            }

            case FAILED:
            case SUCCEEDED: {
                const { url, method } = action.payload
                if (method !== METHODS.get) {
                    return state
                }

                const { resource } = parseURL(url)
                const keys = compact(['global', url, resource])

                return {
                    ...state,
                    pendingRequests: reduce(keys, (acc, key) => ({
                        ...acc,
                        [key]: _get(acc, key, 0) - 1
                    }), state.pendingRequests)
                }
            }

            default: return state
        }
    }

    function reduceRequests(resourceName, state = {}, action = {}) {
        const resource = getResource(resourceName)
        if (!resource) {
            return state
        }

        switch (action.type) {
            case resource.GET_SUCCEEDED:
            case resource.CREATE_SUCCEEDED:
            case resource.UPDATE_SUCCEEDED: {
                const { data, url } = action.payload

                const entities = reduce(data, (acc, entry, key) => ({
                    ...acc,
                    [key]: {
                        ...acc[key],
                        ...entry
                    }
                }), _get(state, 'entities', {}))

                const paginationHash = getPaginationHash(url)
                const currentPage = toInteger(_get(parseURL(url), 'params.page', 1))
                const loadedPages = _get(state, ['meta', paginationHash, 'loadedPages'], [])

                const meta = {
                    ..._get(state, 'meta', {}),
                    [paginationHash]: {
                        ...action.payload.meta,
                        loadedPages: uniq([...loadedPages, currentPage])
                    }
                }

                return {
                    ...state,
                    entities,
                    meta
                }
            }

            case resource.DESTROY_SUCCEEDED: {
                const { url } = action.payload
                const { params: { id } } = parseURL(url)
                return {
                    ...state,
                    entities: omit(state.entities, id)
                }
            }

            default: return state
        }
    }


    //
    //  HELPERS

    function buildURL(resourceOrURL, query = {}) {
        if (!isString(resourceOrURL)) {
            throw new Error(`Invalid resource or URL given: ${JSON.stringify(resourceOrURL)}`)
        }
        const givenURL = URI.parse(resourceOrURL)
        const params = {
            ...URI.parseQuery(givenURL.query),
            ...query
        }

        const url = new URI(baseURL)

        if (isResourceName(resourceOrURL)) {
            const { endpoint } = getResource(resourceOrURL)
            const path = compile(endpoint)(params)
            const routeTokens = map(parse(endpoint), 'name')

            const queryParams = omit(params, routeTokens)

            url.path(URI.joinPaths(url.path(), normalizePath(path)).toString())
            url.query(queryParams)
        } else {
            url.path(URI.joinPaths(url.path(), normalizePath(resourceOrURL)).toString())
            url.query(params)
        }

        return url.toString()
    }

    function parseURL(url) {
        const matchedRoutes = compact(map(resources, ({ name, endpoint }) => {
            const match = matchPath(normalizePath(url), { path: endpoint, exact: true })
            return match ? { ...match, resource: name } : null
        }))

        const parsedURL = URI.parse(url)

        if (!isEmpty(matchedRoutes)) {
            const { resource, params } = head(matchedRoutes)
            const allParams = {
                ...URI.parseQuery(parsedURL.query),
                ...params
            }

            return {
                resource,
                params: omitBy(allParams, isNil)
            }
        }

        return {
            resource : null,
            path     : parsedURL.path,
            params   : URI.parseQuery(parsedURL.query)
        }
    }

    function normalizePath(path) {
        const givenURL = new URI(path)
        const apiBaseURL = new URI(baseURL)

        const replacements = [
            [new RegExp(`^(/?${apiBaseURL.path()})?`), '/'],
            [/\/+/g, '/'],
            [/^([^.]*[^/])$/, '$1/']
        ]

        return reduce(replacements, (acc, [pattern, replacement]) => (
            replace(acc, pattern, replacement)
        ), givenURL.path())
    }

    function normalizeResponseWithSchema(responseData, schema) {
        if (isObject(schema)) {
            if (isListResponse(responseData)) {
                return normalize(responseData, { results: [schema] })
            }
            if (isObject(responseData)) {
                return normalize(responseData, schema)
            }
        }
        return {
            entities : {},
            result   : []
        }
    }

    function isListResponse(response) {
        return has(response, 'results') && has(response, 'pages') && has(response, 'page_size')
    }

    function createResource(name, endpoint) {
        return {
            name,
            endpoint,
            schema    : createSchema(name),
            selectors : createSelectors(name),
            ...createActionTypes(name)
        }
    }

    function createSchema(resourceName) {
        const mappingOptions = (resourceName) => {
            if (has(mappings, resourceName)) {
                return reduce(mappings[resourceName], (acc, nestedResourceName, key) => ({
                    ...acc,
                    [key]: createSchema(nestedResourceName)
                }), {})
            }
            return {}
        }

        if (isArray(resourceName)) {
            const resource = head(resourceName)
            return [new schema.Entity(resource, mappingOptions(resource), _get(options, resource, {}))]
        }
        if (isString(resourceName)) {
            return new schema.Entity(resourceName, mappingOptions(resourceName), _get(options, resourceName, {}))
        }

        return null
    }

    function createActionTypes(resourceName, actions = ACTIONS) {
        const actionNames = reduce(actions, (types, action) => {
            if (includes(ACTIONS, action)) {
                return {
                    ...types,
                    ...reduce(STATES, (actions, state) => {
                        const key = actionDescriptor(action, state)
                        return {
                            ...actions,
                            [key]: `@ ${snakeCase(resourceName)} / ${key}`
                        }
                    }, {})
                }
            }
            return types
        }, {})
        return actionNames
    }

    function createRootSelector(resourceName) {
        return (state) => _get(state, [resourceName, 'entities'], {})
    }

    function createSelectors(resourceName) {
        const getAll = createRootSelector(resourceName)
        const getForID = (id) => createSelector(
            getAll,
            (entities) => entities[id]
        )
        const getForURL = (url) => createSelector(
            getAll,
            (entities) => find(entities, { url })
        )
        const countAll = createSelector(
            getAll,
            (entities) => size(keys(entities))
        )

        return {
            getAll, getForID, getForURL, countAll
        }
    }

    function actionDescriptor(action, state) {
        if (includes(ACTIONS, action) && includes(STATES, state)) {
            return toUpper(join([action, state], '_'))
        }
        return null
    }

    function isResourceName(name) {
        return has(resources, name)
    }

    function getResource(name) {
        return resources[name]
    }

    function setHeaders(headers) {
        forEach(headers, (value, name) => {
            axios.defaults.headers.common[name] = value
        })
    }

    function buildFormData(data) {
        return reduce(data, (acc, value, key) => {
            acc.append(key, value)
            return acc
        }, new FormData())
    }

    function isNetworkError(error) {
        return error.message && !isEmpty(error.message.match(/^(Request failed with status code|Network Error)/))
    }

    function isTimeoutError(error) {
        return error.message && !isEmpty(error.message.match(/^timeout of (\d+)ms exceeded/))
    }

    function parseErrors(errorResponse) {
        let response = errorResponse

        if (has(response, 'payload.error')) {
            response = _get(response, 'payload.error')
        }
        if (has(response, 'error')) {
            response = _get(response, 'error')
        }

        const errors = has(response, 'response.data')
            ? _get(response, 'response.data')
            : response

        const parseError = (error) => {
            if (isArray(error)) {
                return map(error, parseError)
            }
            if (isString(error)) {
                return error
            }
            if (isObject(error) && has(error, 'message') && has(error, 'code')) {
                return error.message
            }
            if (isObject(error)) {
                return reduce(error, (acc, field, name) => ({
                    ...acc,
                    [name]: parseError(field)
                }), {})
            }
            return null
        }

        if (isString(errors)) {
            if (errors[0] === '<') {
                return { _error: 'Internal Server Error' }
            }

            return {
                _error: errors
            }
        }

        return reduce(errors, (acc, error, key) => {
            const field = key === 'non_field_errors' ? '_error' : key
            return {
                ...acc,
                [field]: parseError(error)
            }
        }, {})
    }

    function getPaginationHash(url) {
        const { resource, params } = parseURL(url)
        const sortParams = (params) => {
            const sortedKeys = sortBy(keys(params))
            return flatMap(sortedKeys, (key) => [key, _get(params, key)])
        }
        const key = join([resource, ...sortParams(omit(params, 'page'))], '__')
        return md5(key)
    }

    //
    //  SELECTORS

    const isLoading = (resourceOrURL) => createSelector(
        (state) => (state.api),
        (api) => _get(api, ['pendingRequests', resourceOrURL || 'global'], 0) > 0
    )
    const getPaginationMeta = (url) => (state) => {
        const { resource } = parseURL(url)
        return _get(state, [resource, 'meta', getPaginationHash(url)], {})
    }
    const getNextPageNumber = (url) => createSelector(
        [getCurrentPageNumber(url), getTotalPagesNumber(url)],
        (currentPage, totalPages) => {
            if (!totalPages) {
                return null
            }
            if (currentPage === totalPages) {
                return null
            }
            return currentPage + 1
        }
    )
    const getTotalPagesNumber = (url) => createSelector(
        getPaginationMeta(url),
        (meta) => ceil(_get(meta, 'count', 0) / _get(meta, 'page_size', 1))
    )
    const getCurrentPageNumber = (url) => createSelector(
        getLoadedPages(url),
        (pages) => max(pages) || 1
    )
    const getLoadedPages = (url) => createSelector(
        getPaginationMeta(url),
        (meta) => _get(meta, 'loadedPages', [])
    )

    return {
        get,
        create,
        update,
        destroy,
        upload,
        download,
        waitForResponse,
        ...resources,
        reduceRequests,
        baseURL,

        http,
        setHeaders,
        normalizeResponseWithSchema,
        isNetworkError,
        isTimeoutError,
        parseErrors,
        normalizePath,
        buildURL,
        parseURL,
        buildFormData,
        getPaginationHash,

        reducer,
        saga,

        isLoading,
        getPaginationMeta,
        getCurrentPageNumber,
        getNextPageNumber,
        getTotalPagesNumber,
        getLoadedPages,

        REQUESTED,
        SUCCEEDED,
        FAILED,
        DOWNLOAD_REQUESTED,
        DOWNLOAD_SUCCEEDED,
        DOWNLOAD_FAILED
    }
}
