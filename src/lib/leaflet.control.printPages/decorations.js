class PrintStaticLayer {
    _layerDummy = true;
    _printProgressWeight = 0.01;

    cloneForPrint() {
        return this;
    }

    // printOptions = {
    //     xhrOptions,
    //     pixelBounds,
    //     latLngBounds,
    //     destPixelSize,
    //     resolution,
    //     scale,
    //     zoom
    // }
    async getTilesInfo(printOptions) {
        return {
            iterateTilePromises: (function*() {
                yield {
                    tilePromise: Promise.resolve({
                            draw: (canvas) => this._drawRaster(canvas, printOptions),
                            isOverlay: true,
                            overlaySolid: this.overlaySolid
                        }
                    ),
                    abortLoading: () => {
                        // no actions needed
                    }
                };
            }).bind(this),
            count: 1
        };
    }

    _drawRaster(_unused_canvas, _unused_printOptions) {
        throw new Error("Method not implemented");
    }
}

export {PrintStaticLayer};
