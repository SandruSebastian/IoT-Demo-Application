import React from 'react'
import PropTypes from 'prop-types'
import { View, StyleSheet, ViewPropTypes } from 'react-native'

const Container = ({ children, withPadding, style, flex }) => (
    <View style={[styles.container, style, withPadding && styles.padded, { flexDirection: flex }]}>
        { children }
    </View>
)

Container.propTypes = {
    style       : ViewPropTypes.style,
    withPadding : PropTypes.bool,
    flex        : PropTypes.oneOf(['row', 'column'])
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    padded: {
        padding: 15
    }
})

export default Container
