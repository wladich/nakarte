function parseYandexRulerString(s) {
    var last_lat = 0;
    var last_lng = 0;
    var error;
    var points = [];
    s = s.replace(/%2C/ig, ',');
    var points_str = s.split('~');
    for (var i = 0; i < points_str.length; i++) {
        var point = points_str[i].split(',');
        var lng = parseFloat(point[0]);
        var lat = parseFloat(point[1]);
        if (isNaN(lat) || isNaN(lng)) {
            error = 'CORRUPT';
            break;
        }
        last_lng += lng;
        last_lat += lat;
        points.push({lat: last_lat, lng: last_lng});
    }
    return {error: error, points: points};
}


function parseYandexRulerUrl(s) {
    var re = /yandex\..+[?&]rl=([^&]+)/;
    var m = re.exec(s);
    if (!m) {
        return null;
    }
    var res = parseYandexRulerString(m[1]);
    return [{name: 'Yandex ruler', error: res.error, tracks: [res.points]}];
}

// function parseYandexMap(txt) {
//     var start_tag = '<script id="vpage" type="application/json">';
//     var json_start = txt.indexOf(start_tag);
//     if (json_start === -1) {
//         return null;
//     }
//     json_start += start_tag.length;
//     var json_end = txt.indexOf('</script>', json_start);
//     if (json_end === -1) {
//         return null;
//     }
//     var map_data = txt.substring(json_start, json_end);
//     map_data = JSON.parse(map_data);
//     console.log(map_data);
//     if (!('request' in map_data)) {
//         return null;
//     }
//     var name = 'YandexMap';
//     var segments = [];
//     var error;
//     if (map_data.vpage && map_data.vpage.data && map_data.vpage.data.objects && map_data.vpage.data.objects.length) {
//         var mapName = ('' + (map_data.vpage.data.name || '')).trim();
//         if (mapName.length > 3) {
//             name = '';
//         } else if (mapName.length) {
//             name += ': ';
//         }
//         name += fileutils.decodeUTF8(mapName);
//         map_data.vpage.data.objects.forEach(function(obj){
//             if (obj.pts && obj.pts.length) {
//                 var segment = [];
//                 for (var i=0; i< obj.pts.length; i++) {
//                     var pt = obj.pts[i];
//                     var lng = parseFloat(pt[0]);
//                     var lat = parseFloat(pt[1]);
//                     if (isNaN(lat) || isNaN(lng)) {
//                         error = 'CORRUPT';
//                         break;
//                     }
//                     segment.push({lat: lat, lng:lng});
//                 }
//                 if (segment.length) {
//                     segments.push(segment);
//                 }
//             }
//         });
//     }
//     if (map_data.request.args && map_data.request.args.rl) {
//         var res = parseYandexRulerString(map_data.request.args.rl);
//         error = error || res.error;
//         if (res.points && res.points.length) {
//             segments.push(res.points);
//         }
//     }
//     return [{name: name, error: error, tracks: segments}];
// }


export {parseYandexRulerUrl}