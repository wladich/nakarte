function truncToFixed(x, precision) {
    let s = x.toString();
    let point = s.indexOf('.');
    if (point === -1) {
        point = s.length;
        s += '.';
    }
    let sliceEnd = point + precision;
    if (precision > 0) {
        s = s.padEnd(point + precision + 1, '0');
        sliceEnd += 1;
    }
    s = s.slice(0, sliceEnd);
    return s;
}

function formatNumber(value, size, precision = 0) {
    if (value < 0) {
      throw new Error('Negative values not supported');
    }

    if (precision > 0) {
        size += 1;
    }
    return truncToFixed(value, precision).padStart(size + precision, '0');
}

function coordinatePresentations(coordinate, isLat) {
    const degrees = Math.abs(coordinate);
    const intDegrees = Math.floor(degrees);
    const minutes = (degrees - intDegrees) * 60;
    const intMinutes = Math.floor(minutes);
    const seconds = (minutes - intMinutes) * 60;

    let direction;
    if (isLat) {
        direction = (coordinate < 0) ? 'S' : 'N';
    } else {
        direction = (coordinate < 0) ? 'W' : 'E';
    }

    return {
        signedDegrees: coordinate.toFixed(5),
        degrees: formatNumber(degrees, 0, 5),
        intDegrees: formatNumber(intDegrees, 0),
        minutes: formatNumber(minutes, 2, 3),
        intMinutes: formatNumber(intMinutes, 2),
        seconds: formatNumber(seconds, 2, 2),
        direction
    };
}

function formatLatLng(latlng, format) {
    return {
        lat: format.formatter(coordinatePresentations(latlng.lat, true)),
        lng: format.formatter(coordinatePresentations(latlng.lng, false))
    };
}

const SIGNED_DEGREES = {
    code: 'd',
    label: '±ddd.ddddd',
    wrapperClass: 'leaflet-coordinates-wrapper-signed-degrees',
    formatter: ({signedDegrees}) => signedDegrees
};

const DEGREES = {
    code: 'D',
    label: 'ddd.ddddd°',
    wrapperClass: 'leaflet-coordinates-wrapper-degrees',
    formatter: ({degrees, direction}) => `${direction} ${degrees}°`
};

const DEGREES_AND_MINUTES = {
    code: 'DM',
    label: 'ddd°mm.mmm′',
    wrapperClass: 'leaflet-coordinates-wrapper-degrees-and-minutes',
    formatter: ({intDegrees, minutes, direction}) => `${direction} ${intDegrees}°${minutes}′`
};

const DEGREES_AND_MINUTES_AND_SECONDS = {
    code: 'DMS',
    label: 'ddd°mm′ss.s″',
    wrapperClass: 'leaflet-coordinates-wrapper-degrees-and-minutes-and-seconds',
    formatter: ({intDegrees, intMinutes, seconds, direction}) => `${direction} ${intDegrees}°${intMinutes}′${seconds}″`
};

export {
    SIGNED_DEGREES,
    DEGREES,
    DEGREES_AND_MINUTES,
    DEGREES_AND_MINUTES_AND_SECONDS,
    formatLatLng
};
