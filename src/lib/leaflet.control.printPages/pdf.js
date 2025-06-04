function header() {
    return '%PDF-1.3';
}

function eof() {
    return '%%EOF\n';
}

function recCatalog() {
    return (
`1 0 obj
<< /Type /Catalog
/Pages 2 0 R
>>
endobj`);
}

function recPages(count) {
    let kidsIds = [];
    for (let i = 0; i < count; i++) {
        kidsIds.push(`${i * 3 + 3} 0 R`);
    }
    kidsIds = kidsIds.join(' ');
    return (
`2 0 obj
<< /Type /Pages        
/Kids [ ${kidsIds} ]
/Count ${count}
>>
endobj`);
}

function recPage(serialNum, width, height) {
    const pageRecId = serialNum * 3 + 3;
    const contentRecId = pageRecId + 1;
    const imageRecId = pageRecId + 2;
    return (
`${pageRecId} 0 obj
<< /Type /Page
/Parent 2 0 R
/MediaBox [0 0 ${width} ${height}]
/Contents ${contentRecId} 0 R
/Rotate ${width > height ? 90 : 0}
/Resources <<
    /XObject << /Im${serialNum} ${imageRecId} 0 R >>
    /ProcSet [ /PDF /Text /ImageC ] 
    >>
>>
endobj`);
}

function recContent(serialNum, width, height) {
    const pageRecId = serialNum * 3 + 3;
    const contentRecId = pageRecId + 1;
    const contents = (
`q
${width} 0 0 ${height} 0 0 cm
/Im${serialNum} Do
Q   `);
    return (
`${contentRecId} 0 obj
<<
/Length ${contents.length + 1}
>>
stream
${contents}   
endstream
endobj`);
}

function recImage(serialNum, widthPixels, heightPixels, data) {
    const pageRecId = serialNum * 3 + 3;
    const imageRecId = pageRecId + 2;

    return (
`${imageRecId} 0 obj
<< /Type /XObject
/Subtype /Image
/Name /Im${serialNum}
/Filter [ /DCTDecode ]
/Width ${widthPixels}
/Height ${heightPixels}
/ColorSpace /DeviceRGB
/BitsPerComponent 8
/Length ${data.length}
>>
stream
${data}
endstream
endobj`);
}

function recTrailer(recOffsets, currentOffset) {
    const trailer = [];
    trailer.push(
`xref
0 ${recOffsets.length + 1}
0000000000 65535 f `);
    const zeroes = '0000000000';
    for (let offset of recOffsets) {
        offset = offset.toString();
        let padding = zeroes.substr(offset.length);
        trailer.push(`${padding}${offset} 00000 n `);
    }

    trailer.push(
`trailer
<< /Root 1 0 R
/Size ${recOffsets.length + 1}
>>
startxref
${currentOffset}`);
    return trailer.join('\n');
}

function makePdf(imagesInfo, resolution) {
    let offset = 0;
    const offsets = [];
    let pdf = [];

    function addRec(s, skipOffset) {
        pdf.push(s);
        if (!skipOffset) {
            offsets.push(offset);
        }
        offset += s.length;
    }

    addRec(header(), true);
    addRec(recCatalog());
    addRec(recPages(imagesInfo.length));
    for (let [i, {data, width, height}] of imagesInfo.entries()) {
        let widthPoints = width / resolution * 72,
            heightPoints = height / resolution * 72;
        addRec(recPage(i, widthPoints, heightPoints));
        addRec(recContent(i, widthPoints, heightPoints));
        addRec(recImage(i, width, height, data));
    }
    addRec(recTrailer(offsets, offset), true);
    addRec(eof(), true);

    pdf = pdf.join('\n');
    return pdf;
}

export {makePdf};

