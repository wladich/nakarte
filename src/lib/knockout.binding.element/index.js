import ko from 'knockout';

// From https://stackoverflow.com/a/23638213
// I do not understand how it works
ko.bindingHandlers.element = {
    init: function (element, valueAccessor) {
        const target = valueAccessor();
        target(element);
    },
};
