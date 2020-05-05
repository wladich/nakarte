import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import './index.css';
import './App.css';
import '~/lib/leaflet.control.panoramas';

function setUp() {
    const map = L.map('map', {
            center: [51.505, -0.09],
            zoom: 13
        }
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
    .addTo(map);

    new L.Control.Panoramas(document.getElementById('street-view'))
        .addTo(map);
}

setUp();

