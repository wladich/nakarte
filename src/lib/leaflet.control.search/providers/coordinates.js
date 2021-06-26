import L from 'leaflet';

const reInteger = '\\d+';
const reFractional = '\\d+(?:\\.\\d+)?';
const reSignedFractional = '-?\\d+(?:\\.\\d+)?';
const reHemisphere = '[NWSE]';

class Coordinates {
    getLatitudeLetter() {
        return this.latIsSouth ? 'S' : 'N';
    }

    getLongitudeLetter() {
        return this.lonIsWest ? 'W' : 'E';
    }

    static parseHemispheres(h1, h2, h3, allowEmpty = false) {
        function isLat(h) {
            return h === 'N' || h === 'S';
        }
        let swapLatLon = false;
        let hLat, hLon;
        if (h1 && h2 && !h3) {
            hLat = h1.trim();
            hLon = h2.trim();
        } else if (h1 && !h2 && h3) {
            hLat = h1.trim();
            hLon = h3.trim();
        } else if (!h1 && h2 && h3) {
            hLat = h2.trim();
            hLon = h3.trim();
        } else if (allowEmpty && !h1 && !h2 && !h3) {
            return {empty: true};
        } else {
            return {error: true};
        }
        if (isLat(hLat) === isLat(hLon)) {
            return {error: true};
        }
        if (isLat(hLon)) {
            [hLat, hLon] = [hLon, hLat];
            swapLatLon = true;
        }
        const latIsSouth = hLat === 'S';
        const lonIsWest = hLon === 'W';
        return {swapLatLon, latIsSouth, lonIsWest};
    }
}

class CoordinatesDMS extends Coordinates {
    static regexp = new RegExp(
        // eslint-disable-next-line max-len
        `^(${reHemisphere} )?(${reInteger}) (${reInteger}) (${reFractional}) (${reHemisphere} )?(${reInteger}) (${reInteger}) (${reFractional})( ${reHemisphere})?$`,
        'u'
    );

    constructor(latDeg, latMin, latSec, latIsSouth, lonDeg, lonMin, lonSec, lonIsWest) {
        super();
        Object.assign(this, {latDeg, latMin, latSec, latIsSouth, lonDeg, lonMin, lonSec, lonIsWest});
    }

    equalTo(other) {
        return (
            this.latDeg === other.latDeg &&
            this.latMin === other.latMin &&
            this.latSec === other.latSec &&
            this.latIsSouth === other.latIsSouth &&
            this.lonDeg === other.lonDeg &&
            this.lonMin === other.lonMin &&
            this.lonSec === other.lonSec &&
            this.lonIsWest === other.lonIsWest
        );
    }

    format() {
        return {
            latitude: `${this.getLatitudeLetter()} ${this.latDeg}°${this.latMin}′${this.latSec}″`,
            longitude: `${this.getLongitudeLetter()} ${this.lonDeg}°${this.lonMin}′${this.lonSec}″`,
        };
    }

    isValid() {
        return (
            this.latDeg >= 0 &&
            this.latDeg <= 90 &&
            this.latMin >= 0 &&
            this.latMin <= 59 &&
            this.latSec >= 0 &&
            this.latSec < 60 &&
            this.lonDeg >= 0 &&
            this.lonDeg <= 180 &&
            this.lonMin >= 0 &&
            this.lonMin <= 59 &&
            this.lonSec >= 0 &&
            this.lonSec < 60 &&
            (this.latDeg <= 89 || (this.latMin === 0 && this.latSec === 0)) &&
            (this.lonDeg <= 179 || (this.lonMin === 0 && this.lonSec === 0))
        );
    }

    getLatLng() {
        let lat = this.latDeg + this.latMin / 60 + this.latSec / 3600;
        if (this.latIsSouth) {
            lat = -lat;
        }
        let lon = this.lonDeg + this.lonMin / 60 + this.lonSec / 3600;
        if (this.lonIsWest) {
            lon = -lon;
        }
        return L.latLng(lat, lon);
    }

    static fromString(s) {
        const m = s.match(CoordinatesDMS.regexp);
        if (!m) {
            return {error: true};
        }
        const [h1, d1Str, m1Str, s1Str, h2, d2Str, m2Str, s2Str, h3] = m.slice(1);
        const hemispheres = CoordinatesDMS.parseHemispheres(h1, h2, h3, true);
        if (hemispheres.error) {
            return {error: true};
        }
        let [d1, m1, s1, d2, m2, s2] = [d1Str, m1Str, s1Str, d2Str, m2Str, s2Str].map(parseFloat);
        const coords = [];
        if (hemispheres.empty) {
            const coord1 = new CoordinatesDMS(d1, m1, s1, false, d2, m2, s2, false);
            const coord2 = new CoordinatesDMS(d2, m2, s2, false, d1, m1, s1, false);
            if (coord1.isValid()) {
                coords.push(coord1);
            }
            if (!coord1.equalTo(coord2) && coord2.isValid()) {
                coords.push(coord2);
            }
        } else {
            if (hemispheres.swapLatLon) {
                [d1, m1, s1, d2, m2, s2] = [d2, m2, s2, d1, m1, s1];
            }
            const coord = new CoordinatesDMS(d1, m1, s1, hemispheres.latIsSouth, d2, m2, s2, hemispheres.lonIsWest);
            if (coord.isValid()) {
                coords.push(coord);
            }
        }
        if (coords.length > 0) {
            return {coordinates: coords};
        }
        return {error: true};
    }
}

class CoordinatesDM extends Coordinates {
    static regexp = new RegExp(
        `^(${reHemisphere} )?(${reInteger}) (${reFractional}) (${reHemisphere} )?(${reInteger}) (${reFractional})( ${reHemisphere})?$`, // eslint-disable-line max-len
        'u'
    );

    constructor(latDeg, latMin, latIsSouth, lonDeg, lonMin, lonIsWest) {
        super();
        Object.assign(this, {latDeg, latMin, latIsSouth, lonDeg, lonMin, lonIsWest});
    }

    equalTo(other) {
        return (
            this.latDeg === other.latDeg &&
            this.latMin === other.latMin &&
            this.latIsSouth === other.latIsSouth &&
            this.lonDeg === other.lonDeg &&
            this.lonMin === other.lonMin &&
            this.lonIsWest === other.lonIsWest
        );
    }

    format() {
        return {
            latitude: `${this.getLatitudeLetter()} ${this.latDeg}°${this.latMin}′`,
            longitude: `${this.getLongitudeLetter()} ${this.lonDeg}°${this.lonMin}′`,
        };
    }

    isValid() {
        return (
            this.latDeg >= 0 &&
            this.latDeg <= 90 &&
            this.latMin >= 0 &&
            this.latMin < 60 &&
            this.lonDeg >= 0 &&
            this.lonDeg <= 180 &&
            this.lonMin >= 0 &&
            this.lonMin < 60 &&
            (this.latDeg <= 89 || this.latMin === 0) &&
            (this.lonDeg <= 179 || this.lonMin === 0)
        );
    }

    getLatLng() {
        let lat = this.latDeg + this.latMin / 60;
        if (this.latIsSouth) {
            lat = -lat;
        }
        let lon = this.lonDeg + this.lonMin / 60;
        if (this.lonIsWest) {
            lon = -lon;
        }
        return L.latLng(lat, lon);
    }

    static fromString(s) {
        const m = s.match(CoordinatesDM.regexp);
        if (!m) {
            return {error: true};
        }
        const [h1, d1Str, m1Str, h2, d2Str, m2Str, h3] = m.slice(1);
        const hemispheres = CoordinatesDM.parseHemispheres(h1, h2, h3, true);
        if (hemispheres.error) {
            return {error: true};
        }
        let [d1, m1, d2, m2] = [d1Str, m1Str, d2Str, m2Str].map(parseFloat);
        const coords = [];
        if (hemispheres.empty) {
            const coord1 = new CoordinatesDM(d1, m1, false, d2, m2, false);
            const coord2 = new CoordinatesDM(d2, m2, false, d1, m1, false);
            if (coord1.isValid()) {
                coords.push(coord1);
            }
            if (!coord1.equalTo(coord2) && coord2.isValid()) {
                coords.push(coord2);
            }
        } else {
            if (hemispheres.swapLatLon) {
                [d1, m1, d2, m2] = [d2, m2, d1, m1];
            }
            const coord = new CoordinatesDM(d1, m1, hemispheres.latIsSouth, d2, m2, hemispheres.lonIsWest);
            if (coord.isValid()) {
                coords.push(coord);
            }
        }
        if (coords.length > 0) {
            return {coordinates: coords};
        }
        return {error: true};
    }
}

class CoordinatesD extends Coordinates {
    static regexp = new RegExp(
        `^(${reHemisphere} )?(${reFractional}) (${reHemisphere} )?(${reFractional})( ${reHemisphere})?$`,
        'u'
    );

    constructor(latDeg, latIsSouth, lonDeg, lonIsWest) {
        super();
        Object.assign(this, {latDeg, latIsSouth, lonDeg, lonIsWest});
    }

    format() {
        return {
            latitude: `${this.getLatitudeLetter()} ${this.latDeg}°`,
            longitude: `${this.getLongitudeLetter()} ${this.lonDeg}°`,
        };
    }

    equalTo(other) {
        return (
            this.latDeg === other.latDeg &&
            this.latIsSouth === other.latIsSouth &&
            this.lonDeg === other.lonDeg &&
            this.lonIsWest === other.lonIsWest
        );
    }

    isValid() {
        return this.latDeg >= 0 && this.latDeg <= 90 && this.lonDeg >= 0 && this.lonDeg <= 180;
    }

    getLatLng() {
        let lat = this.latDeg;
        if (this.latIsSouth) {
            lat = -lat;
        }
        let lon = this.lonDeg;
        if (this.lonIsWest) {
            lon = -lon;
        }
        return L.latLng(lat, lon);
    }

    static fromString(s) {
        const m = s.match(CoordinatesD.regexp);
        if (!m) {
            return {error: true};
        }
        const [h1, d1Str, h2, d2Str, h3] = m.slice(1);
        const hemispheres = CoordinatesD.parseHemispheres(h1, h2, h3);
        if (hemispheres.error) {
            return {error: true};
        }
        let [d1, d2] = [d1Str, d2Str].map(parseFloat);
        if (hemispheres.swapLatLon) {
            [d1, d2] = [d2, d1];
        }
        const coord = new CoordinatesD(d1, hemispheres.latIsSouth, d2, hemispheres.lonIsWest);
        if (coord.isValid()) {
            return {
                coordinates: [coord],
            };
        }
        return {error: true};
    }
}

class CoordinatesDSigned extends Coordinates {
    static regexp = new RegExp(`^(${reSignedFractional}) (${reSignedFractional})$`, 'u');

    constructor(latDegSigned, lonDegSigned) {
        super();
        Object.assign(this, {latDegSigned, lonDegSigned});
    }

    equalTo(other) {
        return this.latDegSigned === other.latDegSigned && this.lonDegSigned === other.lonDegSigned;
    }

    isValid() {
        return (
            this.latDegSigned >= -90 && this.latDegSigned <= 90 && this.lonDegSigned >= -180 && this.lonDegSigned <= 180
        );
    }

    format() {
        return {
            latitude: `${this.latDegSigned}°`,
            longitude: `${this.lonDegSigned}°`,
        };
    }

    getLatLng() {
        return L.latLng(this.latDegSigned, this.lonDegSigned);
    }

    static fromString(s) {
        const m = s.match(CoordinatesDSigned.regexp);
        if (!m) {
            return {error: true};
        }
        const coords = [];
        const [d1, d2] = m.slice(1).map(parseFloat);
        const coord1 = new CoordinatesDSigned(d1, d2);
        if (coord1.isValid()) {
            coords.push(coord1);
        }
        const coord2 = new CoordinatesDSigned(d2, d1);
        if (!coord1.equalTo(coord2)) {
            if (coord2.isValid()) {
                coords.push(coord2);
            }
        }
        if (coords.length === 0) {
            return {error: true};
        }
        return {
            coordinates: coords,
        };
    }
}

class CoordinatesProvider {
    name = 'Coordinates';

    static regexps = {
        // This regexp wag generated using script at https://gist.github.com/wladich/3d15edc8fcd8b735ac883ef60fe10bfe
        // It matches all unicode characters except Lu (Uppercase Letter), Ll (Lowercase Letter)
        // and [0123456789,.-]. It ignores unassigned code points (Cn) and characters that are removed after NFKC
        // normalization.
        // Manually added: "oO" (lat), "оО" (rus)
        // eslint-disable-next-line max-len, no-control-regex, no-misleading-character-class, prettier/prettier
        symbols: /[OoОо\u0000-\u002b\u002f\u003a-\u0040\u005b-\u0060\u007b-\u00bf\u00d7\u00f7\u01bb\u01c0-\u01cc\u0294\u02b9-\u036f\u0375\u03f6\u0482-\u0489\u0559-\u055f\u0589-\u109f\u10fb\u10fc\u1100-\u139f\u1400-\u1c7f\u1cc0-\u1cff\u1d2f-\u1d6a\u1dc0-\u1dff\u1f88-\u1f8f\u1f98-\u1f9f\u1fa8-\u1faf\u1fbc-\u1fc1\u1fcc-\u1fcf\u1ffc-\u2131\u213a-\u214d\u214f-\u2182\u2185-\u2bff\u2ce5-\u2cea\u2cef-\u2cf1\u2cf9-\u2cff\u2d30-\ua63f\ua66e-\ua67f\ua69e-\ua721\ua788-\ua78a\ua78f\ua7f7-\ua7f9\ua7fb-\uab2f\uab5b-\uab5f\uabc0-\uffff]/gu,
        northernHemishphere: /[Nn]|[СсCc] *[Шш]?/gu,
        southernHemishphere: /[Ss]|[Юю] *[Шш]?/gu,
        westernHemishphere: /[Ww]|[Зз] *[Дд]?/gu,
        easternHemishphere: /[EeЕе]|[ВвB] *[Дд]?/gu, // second Ее is cyrillic
    };

    static parsers = [CoordinatesDMS, CoordinatesDM, CoordinatesD, CoordinatesDSigned];

    normalizeInput(inp) {
        let s = inp.normalize('NFKC'); // convert subscripts and superscripts to normal chars
        s = ' ' + s + ' ';
        // replace everything that is not letter, number, minus, dot or comma to space
        s = s.replace(CoordinatesProvider.regexps.symbols, ' ');
        // remove all dots and commas if they are not between digits
        s = s.replace(/[,.](?=\D)/gu, ' ');
        s = s.replace(/(\D)[,.]/gu, '$1 '); // lookbehind is not supported in all browsers
        // if dot is likely to be used as decimal separator, remove all commas
        if (s.includes('.')) {
            s = s.replace(/,/gu, ' ');
        } else {
            // otherwise comma is decimal separator
            s = s.replace(/,/gu, '.');
        }
        s = s.replace(/-(?=\D)/gu, ' '); // remove all minuses that are not in the beginning of number
        s = s.replace(/([^ ])-/gu, '$1 '); // lookbehind is not supported in all browsers

        s = s.replace(CoordinatesProvider.regexps.northernHemishphere, ' N ');
        s = s.replace(CoordinatesProvider.regexps.southernHemishphere, ' S ');
        s = s.replace(CoordinatesProvider.regexps.westernHemishphere, ' W ');
        s = s.replace(CoordinatesProvider.regexps.easternHemishphere, ' E ');

        s = s.replace(/ +/gu, ' '); // compress whitespaces
        s = s.trim();
        return s;
    }

    isOurQuery(query) {
        const coordFieldRe = new RegExp(`^((${reHemisphere})|(${reSignedFractional}))$`, 'u');
        const coordNumbersFieldRe = new RegExp(`^(${reSignedFractional})$`, 'u');
        const fields = this.normalizeInput(query).split(' ');
        return (
            fields.length > 1 &&
            fields.every((field) => field.match(coordFieldRe)) &&
            fields.some((field) => field.match(coordNumbersFieldRe))
        );
    }

    async search(query) {
        const s = this.normalizeInput(query);
        for (const parser of CoordinatesProvider.parsers) {
            const result = parser.fromString(s);
            if (!result.error) {
                const resultItems = result.coordinates.map((it) => {
                    const coordStrings = it.format();
                    return {
                        title: `${coordStrings.latitude} ${coordStrings.longitude}`,
                        latlng: it.getLatLng(),
                        zoom: 17,
                        category: 'Coordinates',
                        address: null,
                        icon: null,
                    };
                });
                return {
                    results: resultItems,
                };
            }
        }
        return {error: 'Invalid coordinates'};
    }
}

export {CoordinatesProvider};
