/**
 * Some general DOM manipulation utilities.
 */
"use strict";

/**
 * Builds the complete form Url, including the query string encoded in its `input` fields.
 *
 * @see http://jsfiddle.net/Q63w6/
 */
squishy.getGlobalContext().getFullFormUrl = function($form) {
	var url = $form.attr('action');
    if (($form.attr('method') || 'get').toLowerCase() === 'get') {
		url += "?";
		var urlElements = [];

		// build query string from `input` fields
		$form.find('input').each(function(){
			var child = $(this);
			var name = child.attr("name");
			if (name) {
			    urlElements.push(name + "=" + child.attr("value") || '');
			}
		});
		urlElements = urlElements.join("&");
		url += urlElements;
	}

	return url;
};


/**
 * @see http://stackoverflow.com/questions/6677035/jquery-scroll-to-element
 */
squishy.getGlobalContext().scrollToElement = function($element, delta) {
	console.assert($element.length, 'Invalid $element - must be a jQuery wrapper (e.g. `$(someHTMLElement)`).');

    $('html, body').animate({ 
        scrollTop: $element.offset().top - (delta || 20)
    }, 100);
};

/**
 * Dims the entire page and highlights the given element.
 * You must make sure the element is actually visible which can be arbitrarily difficult.
 */
squishy.getGlobalContext().dimAllAndHighlightOne = function($element, timeout) {
	// check arguments
	console.assert($element);
	timeout = timeout || 3000;

	/**
	 * Darken the entire page.
	 * @see http://stackoverflow.com/questions/14913788/jquery-dim-entire-page-and-fade-up-one-div-element
	 */
	var dimPageCss = {
	    position: 'fixed',
	    width: '100%',
	    height: '100%',
	    'background-color': '#000',
	    opacity: '.6',
	    'z-index': '9999',
	    top: '0',
	    left: '0'
	}

	// reset function to set everything back to normal
	function resetScreen() {
		This.timer = null;
		$element.css('z-index', This.zIndex);

		// fade out and remove cover
		cover.fadeOut('fast', cover.remove.bind(cover));
	}

	// add dimming cover
	var This = squishy.getGlobalContext().dimAllAndHighlightOne;
	var cover = This.cover || $('<div />').css(dimPageCss);
	cover.fadeIn('fast');

	// check timer
	var timer = This.timer;
	if (timer) {
		// remove old timer and reset everything
		clearTimeout(this.timer);
		resetScreen();
	}

	// highlight new element
	This.zIndex = $element.css('z-index');
	$(document.body).append(cover);
	$element.css('z-index', 10000);

	// start new timer
	setTimeout(function() {
		// reset everything
		resetScreen();
	}, timeout);
};