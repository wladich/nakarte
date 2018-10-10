import './contextmenu.css';

/*
    items = [
        {text: 'Hello', disabled: true},
        '-',
        {text: 'World', callback: fn},
        {text: 'section', separator: true},
    ]
 */

function isDescendant(parent, child) {
    if (!parent) {
        return false;
    }
    while (child) {
        if (child === parent) {
            return true;
        }
        child = child.parentNode;
    }
}


class Contextmenu {
    constructor(items) {
        this.items = items;
    }

    show(e) {
        if (this._container) {
            return;
        }
        if (e.originalEvent) {
            e = e.originalEvent;
        }
        if (e.preventDefault) {
            e.preventDefault();
        } else {
            e.returnValue = false;
        }

        const {clientX: x, clientY: y} = e;

        const container = this._container = document.createElement('div');
        document.body.appendChild(container);
        container.className = 'contextmenu';
        container.style.zIndex = 10000;

        window.addEventListener('keydown', this.onKeyDown, true);
        window.addEventListener('mousedown', this.onMouseDown, true);
        window.addEventListener('touchstart', this.onMouseDown, true);

        for (let item of this.createItems()) {
            container.appendChild(item);
        }
        this.setPosition(x, y);
    }

    hide() {
        if (!this._container) {
            return;
        }
        document.body.removeChild(this._container);
        this._container = null;

        window.removeEventListener('keydown', this.onKeyDown, true);
        window.removeEventListener('mousedown', this.onMouseDown, true);
        window.removeEventListener('touchstart', this.onMouseDown, true);
    }

    onKeyDown = (e) => {
        if (e.keyCode === 27) {
            this.hide();
        }
    };

    onMouseDown = (e) => {
        if (!isDescendant(this._container, e.target)) {
            this.hide();
        }
    };

    setPosition(x, y) {
        const window_width = window.innerWidth,
            window_height = window.innerHeight,
            menu_width = this._container.offsetWidth,
            menu_height = this._container.offsetHeight;
        if (x + menu_width >= window_width) {
            x -= menu_width;
        }
        if (y + menu_height >= window_height) {
            y -= menu_height;
        }
        this._container.style.left = `${x}px`;
        this._container.style.top = `${y}px`;
    }

    *createItems() {
        let items = this.items;
        if (typeof items === 'function') {
            items = items();
        }
        for (let itemOptions of items) {
            if (typeof itemOptions === 'function') {
                itemOptions = itemOptions();
            }
            if (itemOptions === '-' || itemOptions.separator) {
                yield this.createSeparator(itemOptions);
            } if(itemOptions.selectmenu) {
                yield this.createSelectmenu(itemOptions);
            } else {
                yield this.createItem(itemOptions);
            }
        }
    }

    createItem(itemOptions) {
        const el = document.createElement('a');
        let className = 'item';
        if (itemOptions.disabled) {
            className += ' disabled';
        }
        if (itemOptions.header) {
            className += ' header';
        }
        el.innerHTML = itemOptions.text;

        const callback = itemOptions.callback;
        if (callback && !itemOptions.disabled) {
            className += ' action';
            el.addEventListener('click', this.onItemClick.bind(this, callback));
        }
        el.className = className;
        return el;
    }

    onItemClick(callback, e) {
        e.stopPropagation();
        e.preventDefault();
        this.hide();
        callback(e);
    }

    createSeparator(itemOptions) {
        const el = document.createElement('div');
        el.className = 'separator';
        if (itemOptions.text) {
            el.innerHTML = `<span>${itemOptions.text}</span>`;
        }
        return el;
    }

    createSelectmenu(itemOptions) {
        let defaultValue = itemOptions.defaultValue;
        if (typeof defaultValue === "function") {
            defaultValue = defaultValue();
        }
        const el = document.createElement('div');
        el.className = 'selectmenu item';
        const selectEl = document.createElement('select');
        el.appendChild(selectEl);
        let selectedIndex = 0;
        for(let [index, value] of itemOptions.values.entries()) {
            let option = document.createElement('option');
            let label = value;
            if(typeof value == "object") {
                label = value.label;
                value = value.value;
            }
            option.value = value;
            option.innerHTML = label;
            if(value == itemOptions.defaultValue) {
                selectedIndex = index;
            }
            selectEl.appendChild(option);
        }
        selectEl.options.selectedIndex = selectedIndex;
        itemOptions.callback(selectEl.value);
        selectEl.addEventListener('change', function() {
            itemOptions.callback(this.value);
        });
        return el;
    }

}

export default Contextmenu;
