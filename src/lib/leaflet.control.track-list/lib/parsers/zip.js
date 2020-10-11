import {JSUnzip} from '~/vendored/github.com/augustl/js-unzip/js-unzip';
import jsInflate from './jsInflate';
import {decode866} from './codePages';
import parseGeoFile from '../parseGeoFile';

function parseZip(txt, _unused_name) {
    let unzipper;
    try {
        unzipper = new JSUnzip(txt);
    } catch (e) {
        return null;
    }
    if (!unzipper.isZipFile()) {
        return null;
    }
    try {
        unzipper.readEntries();
    } catch (e) {
        return null;
    }
    var geodata_array = [];
    for (var i = 0; i < unzipper.entries.length; i++) {
        var entry = unzipper.entries[i];
        var uncompressed;
        if (entry.compressionMethod === 0) {
            uncompressed = entry.data;
        } else if (entry.compressionMethod === 8) {
            uncompressed = jsInflate(entry.data, entry.uncompressedSize);
        } else {
            return null;
        }
        var file_name = decode866(entry.fileName);
        var geodata = parseGeoFile(file_name, uncompressed);
        for (let item of geodata) {
            if (item.error === 'UNSUPPORTED' && item.name.match(/(\.(pdf|doc|txt|jpg))|\/$/ui)) {
                continue;
            }
            geodata_array.push(item);
        }
    }
    return geodata_array;
}

export default parseZip;
