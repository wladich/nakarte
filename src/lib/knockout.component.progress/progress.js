import ko from 'knockout';
import './style.css';
import '~/lib/controls-styles/controls-styles.css';

ko.components.register('progress-indicator', {
    template: `
        <div class="ko-progress-unknown icon-spinner-nuclear" data-bind="visible: progress() === undefined"></div>
        <div class="ko-progress" data-bind="visible: progress() !== undefined">
            <div class="ko-progress-bkg">
                <div class="ko-progress-bar"  data-bind="style: {width: progress() + '%'}"></div>
            </div>
        </div>`,
    viewModel: function(params) {
        this.progress = ko.pureComputed(function() {
            var range = params.progressRange(),
                done = params.progressDone();
            return done === undefined ? undefined : done * 100 / range;
        });
    }
});
