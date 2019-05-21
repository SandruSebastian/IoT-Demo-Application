import createAPI from './createAPI'

const API_SPEC = {
    endpoints: {
        nodes: '/getStatus/:id?/',
    },
    mappings: {
    },
    options: {
    }
}

const BASE_URL = 'http://192.168.43.140:8000/'

export default createAPI(BASE_URL, API_SPEC)
