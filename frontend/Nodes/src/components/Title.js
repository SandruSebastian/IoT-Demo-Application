import React from 'react'
import { StyleSheet, Text } from 'react-native'

import Colors from '../colors'

const Title = (props) => (
    <Text style={ styles.title } { ...props } />
)

const styles = StyleSheet.create({
    title: {
        fontSize     : 43,
        textAlign    : 'center',
        color        : Colors.darkGrey,
        marginBottom : 24
    }
})

export default Title
