import React from 'react'
import { Text, View } from 'react-native'

import { map } from 'lodash'

import Color from '../colors'

const NodeData = ({ name, data }) => (
    <View style={styles.container}>
        <Text style={styles.node}>{name}</Text>
        {
            map(data,
                ({ sensor, value }, index) => <Text style={styles.sensor} key={index}>{`- ${sensor}: ${value}`}</Text>)
        }
    </View>
)

const styles = {
    container: {
        marginBottom: 20
    },
    node: {
        fontSize   : 18,
        fontWeight : 'bold',
    },
    sensor: {
        fontSize   : 16,
        color      : Color.darkGrey,
        marginLeft : 32
    }
}

export default NodeData
