import L from 'leaflet';
import getGoogle from 'lib/googleMapsApi';


function search(google) {
    const attribution = L.DomUtil.create('div', '', document.body);
    const places = new google.maps.places.PlacesService(attribution);
    places.textSearch({query: 'Moscow'}, (result, status) => {
        console.log({result, status});
        debugger;
    })
}

getGoogle().then(search);