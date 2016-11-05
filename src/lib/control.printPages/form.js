import React, {Component} from 'react';

export default class PrintPagesForm extends Component {
    constructor() {
        super();
        this.state = {
            scale: 500,
            pageWidth: 210,
            pageHeight: 297,
            marginLeft: 3,
            marginRight: 3,
            marginTop: 3,
            marginBottom: 3,
            resolution: 300,
            zoomLevel: 'auto',
            advancedSettingsExpanded: false
        }
    }

    render() {
        return (
            <table className="layout">
                <tbody>
                <tr>
                    <td colSpan="2">
                        <a title="Add page in portrait orientation" className="button-add-page-vert image-button"
                           onClick={this.props.onAddPortraitPage.bind(null, this.state)}/>
                        <a title="Add page in landscape orientation" className="button-add-page-horiz image-button"
                           onClick={this.props.onAddLandscapePage.bind(null, this.state)}/>
                        <a title="Remove all pages" className="button-remove-pages image-button"
                           onClick={this.props.onRemovePages}/>
                    </td>
                </tr>
                <tr>
                    <td className="label">Print scale</td>
                    <td>
                        <div className="preset-values">
                            <a onClick={this.handleScalePresetClicked.bind(null, 100)}>100 m</a>
                            <a onClick={this.handleScalePresetClicked.bind(null, 500)}>500 m</a>
                            <a onClick={this.handleScalePresetClicked.bind(null, 1000)}>1 km</a>
                        </div>
                        <input type="text" className="scale" maxLength="6"
                               value={this.state.scale.toString()}
                               onChange={this.handleNumericChange.bind(null, 'scale')}
                        />&nbsp;m in 1 cm
                    </td>
                </tr>
                {this.state.advancedSettingsExpanded &&
                <tr>
                    <td className="label">Page size</td>
                    <td>
                        <div className="preset-values">
                            <a onClick={this.handleSizePresetClicked.bind(null, 594, 841)}>A1</a>
                            <a onClick={this.handleSizePresetClicked.bind(null, 420, 594)}>A2</a>
                            <a onClick={this.handleSizePresetClicked.bind(null, 297, 420)}>A3</a>
                            <a onClick={this.handleSizePresetClicked.bind(null, 210, 297)}>A4</a>
                            <a onClick={this.handleSizePresetClicked.bind(null, 148, 210)}>A5</a>
                        </div>
                        <input type="text" maxLength="4" title="width" placeholder="width" className="page-size"
                               value={this.state.pageWidth.toString()}
                               onChange={this.handleNumericChange.bind(null, 'pageWidth')}/>
                        &nbsp;x&nbsp;
                        <input type="text" maxLength="4" title="height" placeholder="height" className="page-size"
                               value={this.state.pageHeight.toString()}
                               onChange={this.handleNumericChange.bind(null, 'pageHeight')}/>
                        &nbsp;mm
                    </td>
                </tr>
                }
                {this.state.advancedSettingsExpanded &&
                <tr>
                    <td className="label-high">Margins</td>
                    <td>
                        <table className="margins">
                            <tbody>
                            <tr>
                                <td />
                                <td>
                                    <input type="text" maxLength="2"
                                           value={this.state.marginTop.toString()}
                                           onChange={this.handleNumericChange.bind(null, 'marginTop')}/>
                                </td>
                                <td />
                            </tr>
                            <tr>
                                <td>
                                    <input type="text" maxLength="2"
                                           value={this.state.marginLeft.toString()}
                                           onChange={this.handleNumericChange.bind(null, 'marginLeft')}/>
                                </td>
                                <td />
                                <td>
                                    <input type="text" maxLength="2"
                                           value={this.state.marginRight.toString()}
                                           onChange={this.handleNumericChange.bind(null, 'marginRight')}/>&nbsp;mm
                                </td>
                            </tr>
                            <tr>
                                <td />
                                <td>
                                    <input type="text" maxLength="2"
                                           value={this.state.marginBottom.toString()}
                                           onChange={this.handleNumericChange.bind(null, 'marginBottom')}/>
                                </td>
                                <td />
                            </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
                }
                {this.state.advancedSettingsExpanded &&
                <tr>
                    <td className="label">Resolution</td>
                    <td><input type="text" maxLength="4" className="resolution"
                               value={this.state.resolution.toString()}
                               onChange={this.handleNumericChange.bind(null, 'resolution')}/>&nbsp;dpi
                    </td>
                </tr>
                }
                {this.state.advancedSettingsExpanded &&
                <tr>
                    <td className="label">Source zoom<br/>level</td>
                    <td>
                        <select value={this.state.zoomLevel} onChange={this.handleZoomChange}>
                            <option value="auto">auto</option>
                            {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((i) =>
                                <option value={i.toString()} key={i.toString()}>{i.toString()}</option>
                            )}
                        </select>
                    </td>
                </tr>
                }
                <tr>
                    <td colSpan="2">
                        <a className="button-settings image-button"
                           onClick={this.toggleSettingsExpanded}/>
                        <div className="settings-summary">
                            {this.state.pageWidth} x {this.state.pageHeight} mm, <br/>
                            {this.state.resolution} dpi, zoom {this.state.zoomLevel}
                            {this.state.zoomLevel === 'auto' &&
                                <span> (
                                    <span title="Zoom for satellite and scanned imagery" >{this.state.zoomSat}</span>
                                    &nbsp;/&nbsp;
                                    <span title="Zoom for maps like OSM and Google" >{this.state.zoomMap}</span>
                                )</span>
                            }
                        </div>
                    </td>
                </tr>
                <tr>
                    <td colSpan="2">
                        <a className="text-button button-save" onClick={this.props.onSavePdf.bind(null, this.state)}>
                            Save PDF</a>
                    </td>
                </tr>

                </tbody>
            </table>
        )
    }

    onDataChanged() {
        setTimeout(() => {this.props.onFormDataChanged(this.state)}, 0);
    }

    handleNumericChange = (stateField, e) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value)) {
            this.setState({[stateField]: value});
            this.onDataChanged();
        }
    };

    handleZoomChange = (e) => {
        this.setState({zoomLevel: e.target.value});
        this.onDataChanged();
    };

    toggleSettingsExpanded = (e) => {
        this.setState({advancedSettingsExpanded: !this.state.advancedSettingsExpanded});
    };

    handleScalePresetClicked = (scale) => {
        this.setState({scale});
        this.onDataChanged();
    };

    handleSizePresetClicked = (pageWidth, pageHeight) => {
        this.setState({pageWidth, pageHeight});
        this.onDataChanged();
    };

    setSuggestedZooms(zooms) {
        this.setState(zooms);
    }
}
