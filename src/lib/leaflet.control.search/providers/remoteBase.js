import L from 'leaflet';

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const BaseProvider = L.Class.extend({
    options: {
        maxResponses: null,
        attribution: null,
        delay: 500,
    },

    initialize: function (options) {
        L.setOptions(this, options);
        this.attribution = this.options.attribution;
    },

    getRequestLanguages: function (supportedLanguages, defaultLanguage) {
        let languages = (navigator.languages ?? [])
            .map((s) => s.split('-')[0])
            .filter((value, index, arr) => arr.indexOf(value) === index)
            .filter((lang) => supportedLanguages.includes(lang));
        if (languages.length === 0) {
            languages = [defaultLanguage];
        }
        return languages;
    },

    waitNoNewRequestsSent: async function () {
        if (this.options.delay) {
            this._sleep = sleep(this.options.delay);
            const sleepPromise = this._sleep;
            await sleepPromise;
            return this._sleep === sleepPromise;
        }
        return true;
    },
});

export {BaseProvider};
