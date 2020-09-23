import parseGpx from './gpx';
import parseZip from './zip';
import {parseKmz, parseKml} from './kml';
import {parseOziPlt, parseOziRte, parseOziWpt} from './ozi';

const parsers = [
    parseKmz,
    parseZip,
    parseGpx,
    parseOziRte,
    parseOziPlt,
    parseOziWpt,
    parseKml,
];

export default parsers;
