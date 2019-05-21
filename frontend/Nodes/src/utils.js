import { parseZonedTime, formatZonedTime } from 'timezone-support/dist/parse-format'
import { API_DATETIME_FORMAT, DEFAULT_DATETIME_FORMAT } from './settings'

export function formatTZDateTime(input, format = DEFAULT_DATETIME_FORMAT) {
    const zonedTime = parseZonedTime(input, API_DATETIME_FORMAT)
    return formatZonedTime(zonedTime, format)
}
