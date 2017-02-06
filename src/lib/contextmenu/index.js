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

        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('mousedown', this.onMouseDown, true);

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

        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('mousedown', this.onMouseDown, true);
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
        el.className = className;
        el.innerHTML = itemOptions.text;

        const callback = itemOptions.callback;
        if (callback && !itemOptions.disabled) {
            el.addEventListener('click', this.onItemClick.bind(this, callback));
        }
        return el;
    }

    onItemClick(callback, e) {
        e.stopPropagation();
        e.preventDefault();
        this.hide();
        setTimeout(() => callback(e), 0);
    }

    createSeparator(itemOptions) {
        const el = document.createElement('div');
        el.className = 'separator';
        if (itemOptions.text) {
            el.innerHTML = `<span>${itemOptions.text}</span>`;
        }
        return el;
    }

}

export default Contextmenu;