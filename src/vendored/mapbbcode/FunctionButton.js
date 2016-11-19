import L from 'leaflet';
/*
 * A leaflet button with icon or text and click listener.
 */
L.FunctionButtons = L.Control.extend({
	includes: L.Mixin.Events,

	initialize: function( buttons, options ) {
		if( !('push' in buttons && 'splice' in buttons) )
			buttons = [buttons];
		this._buttons = buttons;
		if( !options && buttons.length > 0 && 'position' in buttons[0] )
			options = { position: buttons[0].position };
		L.Control.prototype.initialize.call(this, options);
	},

	onAdd: function( map ) {
		this._map = map;
		this._links = [];

		var container = L.DomUtil.create('div', 'leaflet-bar');
		for( var i = 0; i < this._buttons.length; i++ ) {
			var button = this._buttons[i],
				link = L.DomUtil.create('a', '', container);
			link._buttonIndex = i; // todo: remove?
			link.href = button.href || '#';
			if( button.href )
				link.target = 'funcbtn';
			link.style.padding = '0 4px';
			link.style.width = 'auto';
			link.style.minWidth = '20px';
			if( button.bgColor )
				link.style.backgroundColor = button.bgColor;
			if( button.title )
				link.title = button.title;
			button.link = link;
			this._updateContent(i);

			var stop = L.DomEvent.stopPropagation;
			L.DomEvent
				.on(link, 'click', stop)
				.on(link, 'mousedown', stop)
				.on(link, 'dblclick', stop);
			if( !button.href )
				L.DomEvent
					.on(link, 'click', L.DomEvent.preventDefault)
					.on(link, 'click', this.clicked, this);
		}

		return container;
	},

	_updateContent: function( n ) {
		if( n >= this._buttons.length )
			return;
		var button = this._buttons[n],
			link = button.link,
			content = button.content;
		if( !link )
			return;
		if( content === undefined || content === false || content === null || content === '' )
			link.innerHTML = button.alt || '&nbsp;';
		else if( typeof content === 'string' ) {
			var ext = content.length < 4 ? '' : content.substring(content.length - 4),
				isData = content.substring(0, 11) === 'data:image/';
			if( ext === '.png' || ext === '.gif' || ext === '.jpg' || isData ) {
				link.style.width = '' + (button.imageSize || 26) + 'px';
				link.style.height = '' + (button.imageSize || 26) + 'px';
				link.style.padding = '0';
				link.style.backgroundImage = 'url(' + content + ')';
				link.style.backgroundRepeat = 'no-repeat';
				link.style.backgroundPosition = button.bgPos ? (-button.bgPos[0]) + 'px ' + (-button.bgPos[1]) + 'px' : '0px 0px';
			} else
				link.innerHTML = content;
		} else {
			while( link.firstChild )
				link.removeChild(link.firstChild);
			link.appendChild(content);
		}
	},

	setContent: function( n, content ) {
		if( content === undefined ) {
			content = n;
			n = 0;
		}
		if( n < this._buttons.length ) {
			this._buttons[n].content = content;
			this._updateContent(n);
		}
	},

	setTitle: function( n, title ) {
		if( title === undefined ) {
			title = n;
			n = 0;
		}
		if( n < this._buttons.length ) {
			var button = this._buttons[n];
			button.title = title;
			if( button.link )
				button.link.title = title;
		}
	},

	setBgPos: function( n, bgPos ) {
		if( bgPos === undefined ) {
			bgPos = n;
			n = 0;
		}
		if( n < this._buttons.length ) {
			var button = this._buttons[n];
			button.bgPos = bgPos;
			if( button.link )
				button.link.style.backgroundPosition = bgPos ? (-bgPos[0]) + 'px ' + (-bgPos[1]) + 'px' : '0px 0px';
		}
	},

	setHref: function( n, href ) {
		if( href === undefined ) {
			href = n;
			n = 0;
		}
		if( n < this._buttons.length ) {
			var button = this._buttons[n];
			button.href = href;
			if( button.link )
				button.link.href = href;
		}
	},

	clicked: function(e) {
		var link = (window.event && window.event.srcElement) || e.target || e.srcElement;
		while( link && 'tagName' in link && link.tagName !== 'A' && !('_buttonIndex' in link ) )
			link = link.parentNode;
		if( '_buttonIndex' in link ) {
			var button = this._buttons[link._buttonIndex];
			if( button ) {
				if( 'callback' in button )
					button.callback.call(button.context);
				this.fire('clicked', { idx: link._buttonIndex });
			}
		}
	}
});

L.functionButtons = function( buttons, options ) {
	return new L.FunctionButtons(buttons, options);
};

/*
 * Helper method from the old class. It is not recommended to use it, please use L.functionButtons().
 */
L.functionButton = function( content, button, options ) {
	if( button )
		button.content = content;
	else
		button = { content: content };
	return L.functionButtons([button], options);
};
