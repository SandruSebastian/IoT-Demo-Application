import React, { Component } from 'react'
import { connect } from 'react-redux'
import { Text, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'

import { map } from 'lodash'

import Container from './Container'
import Title from './Title'
import NodeData from './NodeData'

import * as nodes from '../redux/nodes'

class NodesScreen extends Component {
    componentWillMount() {
        const { dispatch } = this.props

        this.interval = setInterval(() => dispatch(nodes.requestNodesData()), 1000)
    }

    componentWillUnmount() {
        clearInterval(this.interval)
    }

    render() {
        const { updated, nodesData } = this.props

        return (
            <KeyboardAwareScrollView
                key="scrollView"
                extraScrollHeight={ 110 }
                keyboardShouldPersistTaps="handled"
                enableOnAndroid
            >
                <Container style={styles.container}>
                    <Title>Nodes Data</Title>
                    <View style={styles.updatedContainer}>
                        <Text style={styles.updated}>Last update at:</Text>
                        <Text>{`${updated}`}</Text>
                    </View>
                    { map(nodesData, ({ name, data }, index) => <NodeData key={index} name={name} data={data} />) }
                </Container>
            </KeyboardAwareScrollView>
        )
    }
}

function mapStateToProps(state) {
    const { nodes } = state
    const { updated, nodesData } = nodes

    return {
        updated,
        nodesData
    }
}

const styles = {
    container: {
        margin: 24
    },
    updated: {
        fontSize   : 20,
        fontWeight : 'bold'
    },
    updatedContainer: {
        marginBottom: 24
    }
}

export default connect(mapStateToProps)(NodesScreen)
