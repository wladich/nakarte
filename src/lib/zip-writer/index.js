import utf8 from 'utf8';

import {BinStream} from '~/lib/binary-stream';

// Reference:
// https://users.cs.jmu.edu/buchhofp/forensics/formats/pkzip.html
// https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT

const CRC_TABLE = new Uint32Array(256);

(function fillCrcTable() {
    for (let i = 0; i < 256; ++i) {
        let crc = i;
        for (let j = 0; j < 8; ++j) {
            crc = (crc >>> 1) ^ (crc & 0x01 && 0xedb88320);
        }
        CRC_TABLE[i] = crc;
    }
})();

function crc32(s) {
    let crc = -1;
    for (let i = 0, l = s.length; i < l; i++) {
        crc = (crc >>> 8) ^ CRC_TABLE[(crc & 0xff) ^ s.charCodeAt(i)];
    }
    return (crc ^ -1) >>> 0;
}

function buildDOSDateTime(date) {
    return {
        dosTime: (date.getSeconds() >> 1) | (date.getMinutes() << 5) | (date.getHours() << 11),
        dosDate: date.getDate() | ((date.getMonth() + 1) << 5) | ((date.getFullYear() - 1980) << 9),
    };
}

function writeLocalFileHeader(stream, fileName, size, date, crc) {
    const dosDateTime = buildDOSDateTime(date);
    stream.writeBinaryString('\x50\x4b\x03\x04'); // signature
    stream.writeUint16(10); // Version to extract
    stream.writeUint16(1 << 11); // Flags = language encoding
    stream.writeUint16(0); // No compression
    stream.writeUint16(dosDateTime.dosTime);
    stream.writeUint16(dosDateTime.dosDate);
    stream.writeUint32(crc);
    stream.writeUint32(size);
    stream.writeUint32(size);
    stream.writeUint16(fileName.length);
    stream.writeUint16(0); // Extra field len
    stream.writeBinaryString(fileName);
}

function writeCentralDirectoryFileHeader(stream, fileName, size, date, crc, localHeaderOffset) {
    const dosDateTime = buildDOSDateTime(date);
    stream.writeBinaryString('\x50\x4b\x01\x02'); // signature
    stream.writeUint8(10); // Version made by = 1.0
    stream.writeUint8(3); // Made in OS = UNIX
    stream.writeUint16(10); // Version to extract = 1.0
    stream.writeUint16(1 << 11); // Flags = language encoding
    stream.writeUint16(0); // No compression
    stream.writeUint16(dosDateTime.dosTime);
    stream.writeUint16(dosDateTime.dosDate);
    stream.writeUint32(crc);
    stream.writeUint32(size);
    stream.writeUint32(size);
    stream.writeUint16(fileName.length);
    stream.writeUint16(0); // Extra field len
    stream.writeUint16(0); // File comment length
    stream.writeUint16(0); // Disk # start
    stream.writeUint16(0); // Internal attr
    stream.writeUint32(0x81a4_0000); // External attr = regular file, 0644
    stream.writeUint32(localHeaderOffset); // External attr
    stream.writeBinaryString(fileName);
}

function writeEndOfCentralDirectory(stream, filesNumber, centralDirectoryOffset, centralDirectorySize) {
    stream.writeBinaryString('\x50\x4b\x05\x06');
    stream.writeUint16(0); // Disk number
    stream.writeUint16(0); // Disk number with central directory
    stream.writeUint16(filesNumber);
    stream.writeUint16(filesNumber);
    stream.writeUint32(centralDirectorySize);
    stream.writeUint32(centralDirectoryOffset);
    stream.writeUint16(0); // Comment length
}

// files: Array of Object with items:
//     "filename" - string
//     "content" - binary string
// returns: ArrayBuffer
function createZipFile(files) {
    const stream = new BinStream(true);
    const now = new Date();
    const encodedFilenames = [];
    const checkSums = [];
    const headerOffsets = [];

    for (const [i, file] of files.entries()) {
        encodedFilenames[i] = utf8.encode(file.filename);
        checkSums[i] = crc32(file.content);
        headerOffsets[i] = stream.tell();
        writeLocalFileHeader(stream, encodedFilenames[i], file.content.length, now, checkSums[i]);
        stream.writeBinaryString(file.content);
    }

    const centralDirectoryOffset = stream.tell();
    for (const [i, file] of files.entries()) {
        writeCentralDirectoryFileHeader(
            stream,
            encodedFilenames[i],
            file.content.length,
            now,
            checkSums[i],
            headerOffsets[i]
        );
    }

    writeEndOfCentralDirectory(stream, files.length, centralDirectoryOffset, stream.tell() - centralDirectoryOffset);

    return stream.getBuffer();
}

export {createZipFile};
