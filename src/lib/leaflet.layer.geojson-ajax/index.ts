import type * as geojson from 'geojson';
import * as L from 'leaflet';

import * as logging from '~/lib/logging';
import {notify} from '~/lib/notifications';
import {HttpRequest} from '~/lib/xhr-promise';

type GeoJSONAjaxOptions = L.GeoJSONOptions & {
    requestTimeout?: number;
};

class GeoJSONAjax extends L.GeoJSON {
    public options: GeoJSONAjaxOptions = {
        requestTimeout: 30000,
    };

    public readonly url: string;

    private _loadStarted = false;

    constructor(url: string, options: GeoJSONAjaxOptions) {
        super(undefined, options);
        L.Util.setOptions(this, options);
        this.url = url;
    }

    public loadData(): void {
        if (this._loadStarted) {
            return;
        }
        this._loadStarted = true;
        new HttpRequest({url: this.url, timeout: this.options.requestTimeout, responseType: 'json'}).then(
            (response) => {
                if (response.isOk()) {
                    try {
                        this.addData(response.responseJSON as geojson.GeoJsonObject);
                    } catch (e: unknown) {
                        // we catch two cases: 1) when received response is not JSON and response.responseJSON is null
                        // and 2) when object is not a valid GeoJSON and addData throws exception
                        logging.captureMessage('Invalid GeoJSON loaded', {url: this.url, response});
                        notify('Error loading layer data: JSON data invalid');
                    }
                } else {
                    logging.captureMessage('Error loading GeoJSON', {url: this.url, response});
                    notify('Error loading layer data: ' + response.formatStatus());
                }
            },
            (_unused: unknown) => {
                throw new Error('Unexpected promise rejection in GeoJSONAjax.loadData');
            }
        );
    }

    public onAdd(map: L.Map): this {
        const result = super.onAdd(map);
        this.loadData();
        return result;
    }
}

export {GeoJSONAjax};
