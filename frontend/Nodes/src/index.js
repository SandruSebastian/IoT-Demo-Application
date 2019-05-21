/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React from 'react'

import { Provider } from 'react-redux'

import store from './redux/store'
import NodesScreen from './components/NodesScreen'

const App = () => {
    return (
        <Provider store={store}>
            <NodesScreen />
        </Provider>
    )
}

export default App
