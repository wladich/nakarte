function pad(value, size, precision = 0) {
    if (value < 0) {
      return value.toFixed(precision);
    }

    if (precision > 0) size++;

    return value.toFixed(precision).padStart(size + precision, '0');
}

function parseLatLng(signedDegrees, isLat) {
    const degrees    = Math.abs(signedDegrees);
    const intDegrees = Math.floor(degrees);
    const minutes    = (degrees - intDegrees) * 60;
    const intMinutes = Math.floor(minutes);
    const seconds    = (minutes - intMinutes) * 60;

    let direction
    if (isLat) {
        direction = (signedDegrees < 0) ? 'S' : 'N';
    } else {
        direction = (signedDegrees < 0) ? 'W' : 'E';
    }

    return {
        signedDegrees: pad(signedDegrees, 0, 5),
        degrees:       pad(degrees, 0, 5),
        intDegrees:    pad(intDegrees, 0),
        minutes:       pad(minutes, 2, 3),
        intMinutes:    pad(intMinutes, 2),
        seconds:       pad(seconds, 2, 2),
        direction
    };
}

function transform(latlng, format) {
    return {
        lat: format(parseLatLng(latlng.lat, true)),
        lng: format(parseLatLng(latlng.lng, false))
    }
}

const SIGNED_DEGREES = {
    code: 'd',
    label: '±ddd.ddddd',
    wrapperClass: 'leaflet-coordinates-wrapper-signed-degrees',
    process: (latlng) => {
        return transform(latlng, ({signedDegrees}) => signedDegrees);
    }
};

const DEGREES = {
    code: 'D',
    label: 'ddd.ddddd°',
    wrapperClass: 'leaflet-coordinates-wrapper-degrees',
    process: (latlng) => {
        return transform(latlng, ({degrees, direction}) => {
            return `${direction} ${degrees}°`;
        });
    }
};

const DEGREES_AND_MINUTES = {
    code: 'DM',
    label: 'ddd°mm.mmm′',
    wrapperClass: 'leaflet-coordinates-wrapper-degrees-and-minutes',
    process: (latlng) => {
        return transform(latlng, ({intDegrees, minutes, direction}) => {
            return `${direction} ${intDegrees}°${minutes}′`;
        });
    }
};

const DEGREES_AND_MINUTES_AND_SECONDS = {
    code: 'DMS',
    label: 'ddd°mm′ss.s″',
    wrapperClass: 'leaflet-coordinates-wrapper-degrees-and-minutes-and-seconds',
    process: (latlng) => {
        return transform(latlng, ({intDegrees, intMinutes, seconds, direction}) => {
            return `${direction} ${intDegrees}°${intMinutes}′${seconds}″`;
        });
    }
};

export default {
    SIGNED_DEGREES,
    DEGREES,
    DEGREES_AND_MINUTES,
    DEGREES_AND_MINUTES_AND_SECONDS
}
