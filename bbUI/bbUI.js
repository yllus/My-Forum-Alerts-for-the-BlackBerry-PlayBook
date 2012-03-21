/*
* Copyright 2010-2011 Research In Motion Limited.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
bb = {
	
	screens: [], 
	
	// Assign any listeners we need to make the bbUI framework function
	assignBackHandler: function(callback) {
		if (typeof blackberry !== 'undefined') {
			if (blackberry.system.event.onHardwareKey) {
				blackberry.system.event.onHardwareKey(blackberry.system.event.KEY_BACK, callback);
			}
		}
	},
	
	doLoad: function(element) {
		// Apply our styling
		var root;

		if (element == undefined) {
			root = document.body;
		} else  {
			root = element;
		}
		
		bb.screen.apply(root.querySelectorAll('[data-bb-type=screen]'));
		bb.textInput.apply(root.querySelectorAll('input[type=text]'));
		bb.dropdown.apply(root.querySelectorAll('select'));
		bb.roundPanel.apply(root.querySelectorAll('[data-bb-type=round-panel]'));
		bb.textArrowList.apply(root.querySelectorAll('[data-bb-type=text-arrow-list]'));	
		bb.imageList.apply(root.querySelectorAll('[data-bb-type=image-list]'));	
		bb.tallList.apply(root.querySelectorAll('[data-bb-type=tall-list]'));
		bb.inboxList.apply(root.querySelectorAll('[data-bb-type=inbox-list]'));
		bb.bbmBubble.apply(root.querySelectorAll('[data-bb-type=bbm-bubble]'));
		bb.pillButtons.apply(root.querySelectorAll('[data-bb-type=pill-buttons]'));
		bb.labelControlContainers.apply(root.querySelectorAll('[data-bb-type=label-control-container]'));
		bb.button.apply(root.querySelectorAll('[data-bb-type=button]'));
			
		// perform device specific formatting
		bb.screen.reAdjustHeight();
	},
	
	// Contains all device information
	device: {
	
		isHiRes: window.innerHeight > 480 || window.innerWidth > 480,
		
		// Determine if this browser is BB5
		isBB5: function() {
			return navigator.appVersion.indexOf('5.0.0') >= 0;
		},
		
		// Determine if this browser is BB6
		isBB6: function() {
			return navigator.appVersion.indexOf('6.0.0') >= 0;
		},
		
		// Determine if this browser is BB7.. Ripple's Render is similar to that in BB7
		isBB7: function() {
			return (navigator.appVersion.indexOf('7.0.0') >= 0) || (navigator.appVersion.indexOf('7.1.0') >= 0) || (navigator.appVersion.indexOf('Ripple') >= 0);
		},
		
		isPlayBook: function() {
			return (navigator.appVersion.indexOf('PlayBook') >= 0) || ((window.innerWidth == 1024 && window.innerHeight == 600) || (window.innerWidth == 600 && window.innerHeight == 1024));
		},
		
		// Determines if this device supports touch
		isTouch: function() {
			return true;
		}		
	},
	
	loadScreen: function(url, id) {
		// Retrieve the screen contents
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.open("GET",url,false);
		xmlhttp.send();
		// generate our screen content
		var newScreen = xmlhttp.responseText,
			container = document.createElement('div');
		container.setAttribute('id', id);
		container.innerHTML = newScreen;
		
		// Add any Java Script files that need to be included
		var scriptIds = [],
			scripts = container.getElementsByTagName('script'),
			newScriptTags = [];
		container.scriptIds = scriptIds;
		for (var i = 0; i < scripts.length; i++) {
			var bbScript = scripts[i],
				scriptTag = document.createElement('script');
			scriptIds.push({'id' : bbScript.getAttribute('id'), 'onunload': bbScript.getAttribute('onunload')});
			scriptTag.setAttribute('type','text/javascript');
			scriptTag.setAttribute('src', bbScript.getAttribute('src'));
			scriptTag.setAttribute('id', bbScript.getAttribute('id'));
			newScriptTags.push(scriptTag);	
			// Remove script tag from container because we are going to add it to <head>
			bbScript.parentNode.removeChild(bbScript);
		}
		
		// Add getElementById for the container so that it can be used in the onscreenready event
		container.getElementById = function(id, node) {
				var result = null;
				if (!node) {
					node = this;
				}
				
				if ( node.getAttribute('id') == id )
					return node;

				for ( var i = 0; i < node.childNodes.length; i++ ) {
					var child = node.childNodes[i];
					if ( child.nodeType == 1 ) {
						result = this.getElementById( id, child );
						if ( result != null )
							break;
					}
				}
				return result;
			}
		
		// Special handling for inserting script tags		
		bb.screen.scriptCounter = 0;
		bb.screen.totalScripts = newScriptTags.length;
		for (var i = 0; i < newScriptTags.length; i++) {
			var head = document.getElementsByTagName('head');
			if (head.length > 0 ) {
				head[0].appendChild(newScriptTags[i]);
				newScriptTags[i].onload = function() {
					bb.screen.scriptCounter++;
					if(bb.screen.scriptCounter == bb.screen.totalScripts) {
						// When we have scripts we fire the onscreenready and then apply our changes in doLoad()
						if (bb.onscreenready) { 
							bb.onscreenready(container, container.getAttribute('id'));
						}
						bb.doLoad(container);
						// Load in the new content
						document.body.appendChild(container);
						window.scroll(0,0);
						bb.screen.applyEffect(id, container);	
					}
				};
			}	
		}
		
		// In case there are no scripts at all we simply doLoad() now
		if(bb.screen.totalScripts == 0) {
			if (bb.onscreenready) { 
				bb.onscreenready(container, container.getAttribute('id'));
			}
			bb.doLoad(container);
			// Load in the new content
			document.body.appendChild(container);
			window.scroll(0,0);
			bb.screen.applyEffect(id, container);	
		}
		return container;
	},
	

	// Add a new screen to the stack
	pushScreen : function (url, id) {					
		
		// Remove our old screen
		bb.removeLoadedScripts();
		var numItems = bb.screens.length;
		if (numItems > 0) {
			var oldScreen = document.getElementById(bb.screens[numItems -1].id);
			document.body.removeChild(oldScreen);
		}
		
		// Add our screen to the stack
		var container = bb.loadScreen(url, id);
		bb.screens.push({'id' : id, 'url' : url, 'scripts' : container.scriptIds});
	},
	
	// Pop a screen from the stack
	popScreen: function() {
		
		var numItems = bb.screens.length;
		if (numItems > 1) {
			bb.removeLoadedScripts();
			var currentStackItem = bb.screens[numItems-1],
				current = document.getElementById(currentStackItem.id);
			document.body.removeChild(current);
			bb.screens.pop();
			
			// Retrieve our new screen
			var display = bb.screens[numItems-2],
				container = bb.loadScreen(display.url, display.id);
			
			window.scroll(0,0);
			bb.screen.applyEffect(display.id, container);
			
		} else {
			if (blackberry) {
				blackberry.app.exit();
			}
		}
	},
	
	removeLoadedScripts: function() {
		// pop the old item
		var numItems = bb.screens.length;
		if (numItems > 0) {
			var currentStackItem = bb.screens[numItems-1],
				current = document.getElementById(currentStackItem.id);

			// Remove any JavaScript files
			for (var i = 0; i < currentStackItem.scripts.length; i++) {
				var bbScript = currentStackItem.scripts[i],
					scriptTag = document.getElementById(bbScript.id),
					head = document.getElementsByTagName('head');
				// Call the unload function if any is defined
				if (bbScript.onunload) {
					eval(bbScript.onunload);
				}
				if (head.length > 0 ) {
					head[0].removeChild(scriptTag);
				}	
			}
		}
	},
	
	screen: {
		scriptCounter:  0,
		totalScripts: 0,
		
		apply: function(elements) {
			for (var i = 0; i < elements.length; i++) {
				var outerElement = elements[i];
				if (bb.device.isHiRes) {
					outerElement.setAttribute('class', 'bb-hires-screen');
				}
				
				if (bb.device.isPlayBook()) {
					outerElement.style.height = window.innerHeight;
					outerElement.style.width = window.innerWidth;
					outerElement.style.overflow = 'auto';
					//alert(bb.screens.length);
					var titleBar = outerElement.querySelectorAll('[data-bb-type=title]')
					if (titleBar.length > 0) {
						titleBar = titleBar[0];
						
						// Create our scrollable <div>
						var scrollArea = document.createElement('div');
						scrollArea.setAttribute('style','overflow:auto;bottom:0px;position:absolute;top:55px;left:0px;right:0px;');
						outerElement.appendChild(scrollArea);
						// Copy all nodes that are not the title bar
						var tempHolder = [],
							childNode = null, 
							j;
						for (j = 0; j < outerElement.childNodes.length - 1; j++) {
							childNode = outerElement.childNodes[j];
							if (childNode != titleBar) {
								tempHolder.push(childNode);
							}
						}
						// Add them into the scrollable area
						for (j = 0; j < tempHolder.length -1; j++) {
							scrollArea.appendChild(tempHolder[j]);
						}
						
						titleBar.setAttribute('class', 'pb-title-bar');
						titleBar.innerHTML = titleBar.getAttribute('data-bb-caption');
						if (titleBar.hasAttribute('data-bb-back-caption')) {
							var button = document.createElement('div'), 
								buttonInner = document.createElement('div');
							button.setAttribute('class', 'pb-title-bar-back');
							
							button.onclick = bb.popScreen;
							
							buttonInner.setAttribute('class','pb-title-bar-back-inner');
							buttonInner.innerHTML = titleBar.getAttribute('data-bb-back-caption'); 
							button.appendChild(buttonInner);
							titleBar.appendChild(button);
						}
					}
					
				}
				else {
					// See if there is a title bar
					var titleBar = outerElement.querySelectorAll('[data-bb-type=title]')
					if (titleBar.length > 0) {
						titleBar = titleBar[0];
						if (titleBar.hasAttribute('data-bb-caption')) {
							var outerStyle = outerElement.getAttribute('style');
							if (bb.device.isHiRes) {
								titleBar.setAttribute('class', 'bb-hires-screen-title');
								outerElement.setAttribute('style', outerStyle + ';padding-top:33px');
							} else {
								titleBar.setAttribute('class', 'bb-lowres-screen-title');
								outerElement.setAttribute('style', outerStyle + ';padding-top:27px');
							}
							titleBar.innerHTML = titleBar.getAttribute('data-bb-caption');
						}
					}
				}
			}
		},
		
		fadeIn: function (params) {
			// set default values
			var r = 0,
				duration = 1,
				iteration = 1,
				timing = 'ease-out';

			if (document.getElementById(params.id)) {
				var elem = document.getElementById(params.id),
					s = elem.style;

				if (params.random) {
					r = Math.random() * (params.random / 50) - params.random / 100;
				}

				if (params.duration) {
					duration = parseFloat(params.duration) + parseFloat(params.duration) * r;
					duration = Math.round(duration * 1000) / 1000;
				}

				if (params.iteration) {
					iteration = params.iteration;
				}

				if (params.timing) {
					timing = params.timing;
				}

				s['-webkit-animation-name']            = 'bbUI-fade-in';
				s['-webkit-animation-duration']        = duration + 's';
				s['-webkit-animation-timing-function'] = timing;
			}
			else {
				console.warn('Could not access ' + params.id);
			}
		},
		
		applyEffect: function(id, container) {
			// see if there is a display effect
			if (!bb.device.isBB5()) {
				var screen = container.querySelectorAll('[data-bb-type=screen]');
				if (screen.length > 0 ) {
					screen = screen[0];
					var effect = screen.getAttribute('data-bb-effect');
					if (effect != null && effect != undefined) {
						if (effect.toLowerCase() == 'fade') {
							if (bb.device.isBB6()) {
								// On BB6 Fade doesn't work well when input controls are on the screen
								// so we disable the fade effect for the sake of performance
								var inputControls = container.querySelectorAll('input');
								if (inputControls.length == 0) {
									bb.screen.fadeIn({'id': id, 'duration': 1.0});
								}							
							} else {						
								bb.screen.fadeIn({'id': id, 'duration': 1.0});
							}
						}
					}
				}
			}
		},
		
		reAdjustHeight: function() {
			// perform device specific formatting
			if (bb.device.isBB5()) {
				document.body.style.height = screen.height - 27 + 'px';
			}
			else if (bb.device.isBB6()) {
				document.body.style.height = screen.height - 17 + 'px';
			}
			else if (bb.device.isBB7() && (navigator.appVersion.indexOf('Ripple') < 0)) {
				document.body.style.height = screen.height + 'px';
			}
		}
	},
		
	roundPanel: {
		apply: function(elements) {
			if (bb.device.isBB5()) {
				// Apply our transforms to all the panels
				for (var i = 0; i < elements.length; i++) {
					var outerElement = elements[i];
					outerElement.setAttribute('class','bb-round-panel');
					if (outerElement.hasChildNodes()) {
						var innerElements = new Array(),
							innerCount = outerElement.childNodes.length;
						// Grab the internal contents so that we can add them
						// back to the massaged version of this div
						for (var j = 0; j < innerCount; j++) {
							innerElements.push(outerElement.childNodes[j]);
						}	
						for (var j = innerCount - 1; j >= 0; j--) {
							outerElement.removeChild(outerElement.childNodes[j]);
						}
						// Create our new <div>'s
						var placeholder = document.createElement('div');
						placeholder.setAttribute('class','bb-round-panel-top-left bb-round-panel-background ');
						outerElement.appendChild(placeholder);
						placeholder = document.createElement('div');
						placeholder.setAttribute('class','bb-round-panel-top-right bb-round-panel-background ');
						outerElement.appendChild(placeholder);
						var insidePanel = document.createElement('div');
						insidePanel.setAttribute('class','bb-round-panel-inside');
						outerElement.appendChild(insidePanel);
						placeholder = document.createElement('div');
						placeholder.setAttribute('class','bb-round-panel-bottom-left bb-round-panel-background ');
						outerElement.appendChild(placeholder);
						placeholder = document.createElement('div');
						placeholder.setAttribute('class','bb-round-panel-bottom-right bb-round-panel-background ');
						outerElement.appendChild(placeholder);
						// Add our previous children back to the insidePanel
						for (var j = 0; j < innerElements.length; j++) {
							insidePanel.appendChild(innerElements[j]); 
						}
					}
					// Handle the headers
					var items = outerElement.querySelectorAll('[data-bb-type=panel-header]');
					for (var j = 0; j < items.length; j++) {
						items[j].setAttribute('class','bb-lowres-panel-header');
					}
				}
			}
			else {
				for (var i = 0; i < elements.length; i++) {
					var outerElement = elements[i];
					outerElement.setAttribute('class','bb-bb7-round-panel');
					var items = outerElement.querySelectorAll('[data-bb-type=panel-header]');
					for (var j = 0; j < items.length; j++) {
						if (bb.device.isHiRes) {
							items[j].setAttribute('class','bb-hires-panel-header');
						} else {
							items[j].setAttribute('class','bb-lowres-panel-header');
						}
					}
				}
			}
		}
	},
	
	/* Object that contains all the logic for a Text Arrow List */
	textArrowList: {
		
		// Apply our transforms to all arrow lists passed in
		apply: function(elements) {
			for (var i = 0; i < elements.length; i++) {
				var outerElement = elements[i];
				outerElement.setAttribute('class','bb-text-arrow-list');
				// Gather our inner items
				var items = outerElement.querySelectorAll('[data-bb-type=item]');
				for (var j = 0; j < items.length; j++) {
					var innerChildNode = items[j],
						text = innerChildNode.innerHTML;
					innerChildNode.setAttribute('onmouseover', "this.setAttribute('class','bb-text-arrow-list-item-hover')");
					innerChildNode.setAttribute('onmouseout', "this.setAttribute('class','bb-text-arrow-list-item')");
					innerChildNode.setAttribute('x-blackberry-focusable','true');
					
					innerChildNode.innerHTML = '<span class="bb-text-arrow-list-item-value">'+ text + '</span>' +
											'<div class="bb-arrow-list-arrow"></div>';
					
					// Create our separator <div>
					if (j < items.length - 1) {
						var placeholder = document.createElement('div');
						placeholder.setAttribute('class','bb-arrow-list-separator');
						outerElement.insertBefore(placeholder,innerChildNode.nextSibling);
					}				
				}			
			}	
		}
	},
	
	/* Object that contains all the logic for inputs of type text */
	textInput: {
		apply: function(elements) {
			if (bb.device.isBB5()) {
				for (var i = 0; i < elements.length; i++) {
					var outerElement = elements[i];
				}
			} else {
				for (var i = 0; i < elements.length; i++) {
					var outerElement = elements[i],
						style = 'bb-bb7-input';
					
					if (bb.device.isHiRes) {
						style = style + ' bb-bb7-input-hires';
					} else {
						style = style + ' bb-bb7-input-lowres';
					}
					// Apply our style
					outerElement.setAttribute('class', style);
				}
			
			}		
		}
	
	},
	
	/* Object that contains all the logic for buttons */
	button: {
		
		// Apply our transforms to all arrow buttons passed in
		apply: function(elements) {
		
			if (bb.device.isBB5()) {
				for (var i = 0; i < elements.length; i++) {
					var outerElement = elements[i],
						caption = outerElement.innerHTML,
						normal = 'bb5-button',
						highlight = 'bb5-button-highlight';

					/*if (outerElement.hasAttribute('data-bb-style')) {
						var style = outerElement.getAttribute('data-bb-style');
						if (style == 'stretch') {
							normal = normal + ' button-stretch';
							highlight = highlight + ' button-stretch';
						}
					}*/
					outerElement.innerHTML = '';
					outerElement.setAttribute('class','bb-bb5-button');
					var button = document.createElement('a');
				    //button.setAttribute('href','#');
					button.setAttribute('class',normal);
					button.setAttribute('x-blackberry-focusable','true');
					button.setAttribute('onmouseover',"this.setAttribute('class','" + highlight +"')");
					button.setAttribute('onmouseout',"this.setAttribute('class','" + normal + "')");
					outerElement.appendChild(button);
					var span = document.createElement('span');
					span.innerHTML = caption;
					button.appendChild(span);					
				}
			} else {
				for (var i = 0; i < elements.length; i++) {
					var outerElement = elements[i],
						disabled = outerElement.hasAttribute('data-bb-disabled'),
						normal = 'bb-bb7-button',
						highlight = 'bb-bb7-button-highlight';
						
					outerElement.enabled = !disabled;
					
					if (disabled) {
						normal = 'bb-bb7-button-disabled';
						outerElement.removeAttribute('data-bb-disabled');
					}
					
					if (bb.device.isHiRes) {
						normal = normal + ' bb-bb7-button-hires';
						highlight = highlight + ' bb-bb7-button-hires';
					} else {
						normal = normal + ' bb-bb7-button-lowres';
						highlight = highlight + ' bb-bb7-button-lowres';
					}

					if (outerElement.hasAttribute('data-bb-style')) {
						var style = outerElement.getAttribute('data-bb-style');
						if (style == 'stretch') {
							normal = normal + ' button-stretch';
							highlight = highlight + ' button-stretch';
						}
					}
					outerElement.setAttribute('class',normal);
					if (!disabled) {
						outerElement.setAttribute('x-blackberry-focusable','true');
						outerElement.setAttribute('onmouseover',"this.setAttribute('class','" + highlight +"')");
						outerElement.setAttribute('onmouseout',"this.setAttribute('class','" + normal + "')");
					}
					
									
					// Trap the click and call it only if the button is enabled
					outerElement.trappedClick = outerElement.onclick;
					outerElement.onclick = undefined;	
					if (outerElement.trappedClick !== null) {
						outerElement.addEventListener('click',function (e) {
								if (this.enabled) {
									this.trappedClick();
								}
							},false);
					}
					
					// Assign our enable function
					outerElement.enable = function(){
							if (this.enabled) return;
							var normal = 'bb-bb7-button',
								highlight = 'bb-bb7-button-highlight';
							
							if (bb.device.isHiRes) {
								normal = normal + ' bb-bb7-button-hires';
								highlight = highlight + ' bb-bb7-button-hires';
							} else {
								normal = normal + ' bb-bb7-button-lowres';
								highlight = highlight + ' bb-bb7-button-lowres';
							}

							if (this.hasAttribute('data-bb-style')) {
								var style = this.getAttribute('data-bb-style');
								if (style == 'stretch') {
									normal = normal + ' button-stretch';
									highlight = highlight + ' button-stretch';
								}
							}
							this.setAttribute('class',normal);
							this.setAttribute('x-blackberry-focusable','true');
							this.setAttribute('onmouseover',"this.setAttribute('class','" + highlight +"')");
							this.setAttribute('onmouseout',"this.setAttribute('class','" + normal + "')");
							this.enabled = true;
						};
					// Assign our disable function	
					outerElement.disable = function(){
							if (!this.enabled) return;
							var normal = 'bb-bb7-button-disabled';
							
							if (bb.device.isHiRes) {
								normal = normal + ' bb-bb7-button-hires';
							} else {
								normal = normal + ' bb-bb7-button-lowres';
							}

							if (this.hasAttribute('data-bb-style')) {
								var style = this.getAttribute('data-bb-style');
								if (style == 'stretch') {
									normal = normal + ' button-stretch';
									highlight = highlight + ' button-stretch';
								}
							}
							this.setAttribute('class',normal);
							this.removeAttribute('x-blackberry-focusable');
							this.removeAttribute('onmouseover');
							this.removeAttribute('onmouseout');
							this.enabled = false;
						};
				}	
			}
		}
	},
	
	/* Object that contains all the logic for drop downs */
	dropdown: {
		
		// Apply our transforms to all dropdowns passed in
		apply: function(elements) {
			if (bb.device.isBB5()) {
				
			} else {
				for (var i = 0; i < elements.length; i++) {
					var outerElement = elements[i],
						options = outerElement.getElementsByTagName('option'),
						caption = '';
						
					outerElement.style.display = 'none';
					// Get our selected item
					if (options.length > 0) {
						caption = options[0].innerHTML;
					}
					for (var j = 0; j < options.length; j++) {
						if (options[j].hasAttribute('selected')) {
							caption = options[j].innerHTML;
							break;
						}
					}
					
					// Create our new dropdown button
					var dropdown = document.createElement('div');
					dropdown.innerHTML = '<div data-bb-type="caption"><span>' + caption + '</span></div>';
					
					var normal = 'bb-bb7-dropdown',
						highlight = 'bb-bb7-dropdown-highlight';
					
					if (bb.device.isHiRes) {
						normal = normal + ' bb-bb7-dropdown-hires';
						highlight = highlight + ' bb-bb7-dropdown-hires';
					} else {
						normal = normal + ' bb-bb7-dropdown-lowres';
						highlight = highlight + ' bb-bb7-dropdown-lowres';
					}

					if (outerElement.hasAttribute('data-bb-style')) {
						var style = outerElement.getAttribute('data-bb-style');
						if (style == 'stretch') {
							normal = normal + ' dropdown-stretch';
							highlight = highlight + ' dropdown-stretch';
						}
					}
					dropdown.setAttribute('data-bb-type','dropdown');
					dropdown.setAttribute('class',normal);
					dropdown.setAttribute('x-blackberry-focusable','true');
					dropdown.setAttribute('onmouseover',"this.setAttribute('class','" + highlight +"')");
					dropdown.setAttribute('onmouseout',"this.setAttribute('class','" + normal + "')");
					outerElement.parentNode.insertBefore(dropdown, outerElement);
					dropdown.appendChild(outerElement);
					
					// Assign our functions to be able to set the value
					outerElement.dropdown = dropdown;
					outerElement.setValue = function(value) {
						var select = this.dropdown.getElementsByTagName('select')[0];
						if (select && select.value != value) {
							select.value = value;
							// Change our button caption
							var caption = this.dropdown.querySelectorAll('[data-bb-type=caption]')[0];
							if (caption) {
								caption.innerHTML = '<span>' + select.options[select.selectedIndex].text + '</span>';
							}
							// Raise the DOM event
							var evObj = document.createEvent('HTMLEvents');
							evObj.initEvent('change', false, true );
							select.dispatchEvent(evObj);
						}	
					
					}					
					
					// Set our click handler
					dropdown.onclick = function() {
							var select = this.getElementsByTagName('select')[0];
							// Add our emulation for Ripple
							if (!bb.device.isBB5()) {
								// Create the overlay to trap clicks on the screen
								var overlay = document.createElement('div');
								overlay.setAttribute('id', 'ripple-dropdown-overlay');
								overlay.setAttribute('style', 'position: absolute;left: 0px;top: ' + document.body.scrollTop + 'px;width:100%;height:100%;z-index: 1000000;');
								// Close the overlay if they click outside of the select box
								overlay.onclick = function () {
									if (this.parentNode !== null) {
										this.parentNode.removeChild(this);
									}
								};
								
								// Create our dialog
								var dialog = document.createElement('div');
								if (bb.device.isHiRes) {
									dialog.setAttribute('class', 'ripple-dropdown-dialog bb-hires-screen');
								} else {
									dialog.setAttribute('class', 'ripple-dropdown-dialog');
								}
								overlay.appendChild(dialog);
								dialog.onclick = function() {
									this.parentNode.parentNode.removeChild(this.parentNode);
								};
								
								// Add our options
								for (var i = 0; i < select.options.length; i++) {
									var item = select.options[i],
										highlight = document.createElement('div');
									
									dialog.appendChild(highlight);
									var option = document.createElement('div');
									if (item.selected) {
										option.setAttribute('class', 'item selected');
										highlight.setAttribute('class','backgroundHighlight backgroundSelected');
									} else {
										option.setAttribute('class', 'item');
										highlight.setAttribute('class','backgroundHighlight');
									}

									option.innerHTML = '<span>' + item.text + '</span>';
									option.setAttribute('x-blackberry-focusable','true');
									option.setAttribute('data-bb-value', item.getAttribute('value'));
									// Assign our dropdown for when the item is clicked
									option.dropdown = this;
									option.onclick = function() {
										var value = this.getAttribute('data-bb-value');
										// Retrieve our select										
										var select = this.dropdown.getElementsByTagName('select')[0];
										if (select) {
											select.setValue(value);
										}
									}
									// Add to the DOM
									highlight.appendChild(option);	
								}
								
								var height = (select.options.length * 45) + 20,
									maxHeight = window.innerHeight - 80;
								if (height > maxHeight) {
									height = maxHeight;
									dialog.style.height = maxHeight + 'px';
								}

								var top = (window.innerHeight/2) - (height/2);
								dialog.style.top = top + 'px';
								
								// Add the overlay to the DOM now that we are done
								document.body.appendChild(overlay);
							}
						};
				}	
			}
		}
	},
	
	labelControlContainers: {
		// Apply our transforms to all label control rows
		apply: function(elements) {
			if (bb.device.isBB5()) {
				for (var i = 0; i < elements.length; i++) {
					var outerElement = elements[i];
					outerElement.setAttribute('class','bb-label-control-horizontal-row');
					// Gather our inner items
					var items = outerElement.querySelectorAll('[data-bb-type=label]');
					for (var j = 0; j < items.length; j++) {
						var label = items[j];
						label.setAttribute('class', 'bb-label');
					}
				}	
			} else {
				for (var i = 0; i < elements.length; i++) {
					var outerElement = elements[i];
					
					// Fetch all our rows
					var items = outerElement.querySelectorAll('[data-bb-type=row]');
					if (items.length > 0 ) {
						// Create our containing table
						var table = document.createElement('table');
						table.setAttribute('class','bb-bb7-label-control-rows');
						outerElement.insertBefore(table,items[0]);
						
						for (var j = 0; j < items.length; j++) {
							var row = items[j],
								tr = document.createElement('tr');
							table.appendChild(tr);
							// Get the label
							var tdLabel = document.createElement('td');
							tr.appendChild(tdLabel);
							var label = row.querySelectorAll('[data-bb-type=label]')[0];
							row.removeChild(label);
							tdLabel.appendChild(label);
							// Get the control
							var tdControl = document.createElement('td');
							tr.appendChild(tdControl);
							var control = row.querySelectorAll('[data-bb-type=button],input,[data-bb-type=dropdown]')[0];
							row.removeChild(control);
							tdControl.appendChild(control);
							outerElement.removeChild(row);
							var bbType = control.getAttribute('data-bb-type');
							if (bbType == 'button' || bbType == 'dropdown') {
								control.style.float = 'right';
							}
						}
					}
				}				
			}
		}
	},
	
	/* Object that contains all the logic for Pill Buttons*/
	pillButtons: {
		// Apply our transforms to all pill buttons passed in
		apply: function(elements) {
			if (bb.device.isBB5()) {
				for (var i = 0; i < elements.length; i++) {
					var outerElement = elements[i];
					outerElement.setAttribute('class','bb-pill-buttons');

					// Gather our inner items
					var items = outerElement.querySelectorAll('[data-bb-type=pill-button]');
					for (var j = 0; j < items.length; j++) {
						var innerChildNode = items[j];
						innerChildNode.setAttribute('x-blackberry-focusable','true');
						var text = innerChildNode.innerHTML;
						innerChildNode.innerHTML = '<span>' + text + '</span>';
						
						if (j == 0) {
							innerChildNode.setAttribute('class','buttonLeft');
						}
						else if (j == items.length -1) {
							innerChildNode.setAttribute('class','buttonRight');
						}
						else {
							innerChildNode.setAttribute('class','buttonMiddle');
						}
						
						// See if the item is marked as selected
						if (innerChildNode.hasAttribute('data-bb-selected') && innerChildNode.getAttribute('data-bb-selected').toLowerCase() == 'true') {
							bb.pillButtons.selectButton(innerChildNode);
						}
						
						// Change the selected state when a user presses the button
						innerChildNode.onmousedown = function() {
							bb.pillButtons.selectButton(this);
							var buttons = this.parentNode.querySelectorAll('[data-bb-type=pill-button]');
							for (var i = 0; i < buttons.length; i++) {
								var button = buttons[i];
								if (button != this) {
									bb.pillButtons.deSelectButton(button);
								}
							}
						}
					}			
				}	
			} else {
				for (var i = 0; i < elements.length; i++) {
					var outerElement = elements[i],
						containerStyle = 'bb-bb7-pill-buttons',
						buttonStyle = '';
					
					// Set our container style
					if (bb.device.isHiRes) {
						containerStyle = containerStyle + ' bb-bb7-pill-buttons-hires';
						buttonStyle = 'bb-bb7-pill-button-hires';
					} else {
						containerStyle = containerStyle + ' bb-bb7-pill-buttons-lowres';
						buttonStyle = 'bb-bb7-pill-button-lowres';
					}
					outerElement.setAttribute('class',containerStyle);
					
					
					// Gather our inner items
					var items = outerElement.querySelectorAll('[data-bb-type=pill-button]'),
						percentWidth = Math.floor(98 / items.length),
						sidePadding = 102-(percentWidth * items.length);
						
					outerElement.style['padding-left'] = sidePadding + '%';
					outerElement.style['padding-right'] = sidePadding + '%';
					for (var j = 0; j < items.length; j++) {
						var innerChildNode = items[j];
						innerChildNode.setAttribute('x-blackberry-focusable','true');
						if (j == 0) {  // First button
							if (innerChildNode.getAttribute('data-bb-selected') == 'true') {
								innerChildNode.setAttribute('class','bb-bb7-pill-button-highlight bb-bb7-pill-button-left '+ buttonStyle);
							} else {
								innerChildNode.setAttribute('class','bb-bb7-pill-button bb-bb7-pill-button-left '+ buttonStyle);
								innerChildNode.setAttribute('onmouseover',"this.setAttribute('class','bb-bb7-pill-button-highlight bb-bb7-pill-button-left " + buttonStyle +"')");
								innerChildNode.setAttribute('onmouseout',"this.setAttribute('class','bb-bb7-pill-button bb-bb7-pill-button-left " + buttonStyle +"')");
							}
						} else if (j == items.length -1) { // Right button
							if (innerChildNode.getAttribute('data-bb-selected') == 'true') {
								innerChildNode.setAttribute('class','bb-bb7-pill-button-highlight bb-bb7-pill-button-right '+ buttonStyle);
							} else {
								innerChildNode.setAttribute('class','bb-bb7-pill-button bb-bb7-pill-button-right ' + buttonStyle);
								innerChildNode.setAttribute('onmouseover',"this.setAttribute('class','bb-bb7-pill-button-highlight bb-bb7-pill-button-right " + buttonStyle +"')");
								innerChildNode.setAttribute('onmouseout',"this.setAttribute('class','bb-bb7-pill-button bb-bb7-pill-button-right " + buttonStyle +"')");
							}
						} else { // Middle Buttons
							if (innerChildNode.getAttribute('data-bb-selected') == 'true') {
								innerChildNode.setAttribute('class','bb-bb7-pill-button-highlight '+ buttonStyle);
							} else {
								innerChildNode.setAttribute('class','bb-bb7-pill-button ' + buttonStyle);
								innerChildNode.setAttribute('onmouseover',"this.setAttribute('class','bb-bb7-pill-button-highlight " + buttonStyle +"')");
								innerChildNode.setAttribute('onmouseout',"this.setAttribute('class','bb-bb7-pill-button " + buttonStyle +"')");
							}
						}
						// Set our width
						innerChildNode.style.width = percentWidth + '%';
						// Add our subscription for click events to change highlighting
						innerChildNode.addEventListener('click',function (e) {
								var items = this.parentNode.querySelectorAll('[data-bb-type=pill-button]');
								for (var j = 0; j < items.length; j++) {
									var innerChildNode = items[j];
									
									if (j == 0) {  // First button
										if (innerChildNode == this) {
											innerChildNode.setAttribute('class','bb-bb7-pill-button-highlight bb-bb7-pill-button-left '+ buttonStyle);
											innerChildNode.onmouseover = null;
											innerChildNode.onmouseout = null;
										} else {
											innerChildNode.setAttribute('class','bb-bb7-pill-button bb-bb7-pill-button-left '+ buttonStyle);
											innerChildNode.setAttribute('onmouseover',"this.setAttribute('class','bb-bb7-pill-button-highlight bb-bb7-pill-button-left " + buttonStyle +"')");
											innerChildNode.setAttribute('onmouseout',"this.setAttribute('class','bb-bb7-pill-button bb-bb7-pill-button-left " + buttonStyle +"')");
										}
									} else if (j == items.length -1) { // Right button
										if (innerChildNode == this) {
											innerChildNode.setAttribute('class','bb-bb7-pill-button-highlight bb-bb7-pill-button-right '+ buttonStyle);
											innerChildNode.onmouseover = null;
											innerChildNode.onmouseout = null;
										} else {
											innerChildNode.setAttribute('class','bb-bb7-pill-button bb-bb7-pill-button-right ' + buttonStyle);
											innerChildNode.setAttribute('onmouseover',"this.setAttribute('class','bb-bb7-pill-button-highlight bb-bb7-pill-button-right " + buttonStyle +"')");
											innerChildNode.setAttribute('onmouseout',"this.setAttribute('class','bb-bb7-pill-button bb-bb7-pill-button-right " + buttonStyle +"')");
										}
									} else { // Middle Buttons
										if (innerChildNode == this) {
											innerChildNode.setAttribute('class','bb-bb7-pill-button-highlight '+ buttonStyle);
											innerChildNode.onmouseover = null;
											innerChildNode.onmouseout = null;
										} else {
											innerChildNode.setAttribute('class','bb-bb7-pill-button ' + buttonStyle);
											innerChildNode.setAttribute('onmouseover',"this.setAttribute('class','bb-bb7-pill-button-highlight " + buttonStyle +"')");
											innerChildNode.setAttribute('onmouseout',"this.setAttribute('class','bb-bb7-pill-button " + buttonStyle +"')");
										}
									}
								}
								
							},false);
						
						
					}
				}			
			}
		} /*,
		
		// Reset the button back to its un-selected state
		deSelectButton: function(button) {
			var cssClass = button.getAttribute('class');
			if (cssClass == 'buttonLeft') {
				button.style.backgroundPosition = 'top right';
				button.firstChild.style.backgroundPosition = 'top left'; 
			}
			else if (cssClass == 'buttonRight') {
				button.style.backgroundPosition = 'top right';
				button.firstChild.style.backgroundPosition = '-10px 0px';
			}
			else if (cssClass == 'buttonMiddle') {
				button.style.backgroundPosition = 'top right';
				button.firstChild.style.backgroundPosition = '-10px 0px';
			}
		},
		
		// Highlight the button
		selectButton: function(button) {
			var cssClass = button.getAttribute('class');
			if (cssClass == 'buttonLeft') {
				button.style.backgroundPosition = 'bottom right';
				button.firstChild.style.backgroundPosition = 'bottom left';
			}
			else if (cssClass == 'buttonRight') {
				button.style.backgroundPosition = 'bottom right';
				button.firstChild.style.backgroundPosition = '-10px -39px';
			}
			else if (cssClass == 'buttonMiddle') {
				button.style.backgroundPosition = 'bottom right';
				button.firstChild.style.backgroundPosition = '-10px -39px';
			}
		}*/
	},
	
	imageList: {
		apply: function(elements) {
			// Apply our transforms to all Dark Image Lists
			for (var i = 0; i < elements.length; i++) {
				var outerElement = elements[i];
				
				if (bb.device.isHiRes) {
					outerElement.setAttribute('class','bb-hires-image-list');
				} else {
					outerElement.setAttribute('class','bb-lowres-image-list');
				}
				// Gather our inner items
				var items = outerElement.querySelectorAll('[data-bb-type=item]');
				for (var j = 0; j < items.length; j++) {
					var innerChildNode = items[j];
					if (innerChildNode.hasAttribute('data-bb-type')) {
						var type = innerChildNode.getAttribute('data-bb-type').toLowerCase(),
							description = innerChildNode.innerHTML;
						
						if (bb.device.isHiRes) {
							innerChildNode.setAttribute('class', 'bb-hires-image-list-item');
							innerChildNode.setAttribute('onmouseover', "this.setAttribute('class','bb-hires-image-list-item-hover')");
							innerChildNode.setAttribute('onmouseout', "this.setAttribute('class','bb-hires-image-list-item')");
							innerChildNode.setAttribute('x-blackberry-focusable','true');
							innerChildNode.innerHTML = '<img src="'+ innerChildNode.getAttribute('data-bb-img') +'" />\n'+
											'<div class="details">\n'+
											'	<span class="title">' + innerChildNode.getAttribute('data-bb-title') + '</span>\n'+
											'	<div class="description">' + description + '</div>\n'+
											'</div>\n';
						} else {
							innerChildNode.setAttribute('class', 'bb-lowres-image-list-item');
							innerChildNode.setAttribute('onmouseover', "this.setAttribute('class','bb-lowres-image-list-item-hover')");
							innerChildNode.setAttribute('onmouseout', "this.setAttribute('class','bb-lowres-image-list-item')");
							innerChildNode.setAttribute('x-blackberry-focusable','true');
							innerChildNode.innerHTML = '<img src="'+ innerChildNode.getAttribute('data-bb-img') +'" />\n'+
											'<div class="details">\n'+
											'	<span class="title">' + innerChildNode.getAttribute('data-bb-title') + '</span>\n'+
											'	<div class="description">' + description + '</div>\n'+
											'</div>\n';						
						}
						innerChildNode.removeAttribute('data-bb-img');
						innerChildNode.removeAttribute('data-bb-title');						
					}				
				}			
			}	
		}
	},
	
	tallList: {
		// Apply our transforms to all Tall Lists
		apply: function(elements) {
			for (var i = 0; i < elements.length; i++) {
				var outerElement = elements[i];
				outerElement.setAttribute('class','bb-tall-list');
				
				// Gather our inner items
				var items = outerElement.querySelectorAll('[data-bb-type=item]');
				for (var j = 0; j < items.length; j++) {
					var innerChildNode = items[j];
					if (innerChildNode.hasAttribute('data-bb-type')) {
						var type = innerChildNode.getAttribute('data-bb-type').toLowerCase();
						
						if (type == 'item') {
							var description = innerChildNode.innerHTML;
							innerChildNode.setAttribute('class', 'bb-tall-list-item');
							innerChildNode.setAttribute('onmouseover', "this.setAttribute('class','bb-tall-list-item-hover')");
							innerChildNode.setAttribute('onmouseout', "this.setAttribute('class','bb-tall-list-item')");
							innerChildNode.setAttribute('x-blackberry-focusable','true');
							innerChildNode.innerHTML = '<img src="'+ innerChildNode.getAttribute('data-bb-img') +'" />\n'+
											'<div class="details">\n'+
											'	<span class="title">' + innerChildNode.getAttribute('data-bb-title') + '</span>\n'+
											'	<span class="description">' + description + '</span>\n'+
											'   <div class="time">' + innerChildNode.getAttribute('data-bb-time')+ '</div>\n'+
											'</div>\n';
											
							innerChildNode.removeAttribute('data-bb-img');
							innerChildNode.removeAttribute('data-bb-title');
							innerChildNode.removeAttribute('data-bb-time');
						
						}
					}				
				}		
			}	
		}
	},
	
	inboxList: {
		// Apply our transforms to all Inbox lists
		apply: function(elements) {
			for (var i = 0; i < elements.length; i++) {
				var outerElement = elements[i];
				outerElement.setAttribute('class','bb-inbox-list');
				// Gather our inner items
				var items = outerElement.querySelectorAll('[data-bb-type=item], [data-bb-type=header]');
				for (var j = 0; j < items.length; j++) {
					var innerChildNode = items[j];
					if (innerChildNode.hasAttribute('data-bb-type')) {
						var type = innerChildNode.getAttribute('data-bb-type').toLowerCase();
						
						if (type == 'header') {
							var description = innerChildNode.innerHTML;
							innerChildNode.setAttribute('x-blackberry-focusable','true');
							innerChildNode.innerHTML = '<p>'+ description +'</p>';
							if (bb.device.isHiRes) {
								innerChildNode.setAttribute('class', 'bb-hires-inbox-list-header');
								innerChildNode.setAttribute('onmouseover', "this.setAttribute('class','bb-hires-inbox-list-header-hover')");
								innerChildNode.setAttribute('onmouseout', "this.setAttribute('class','bb-hires-inbox-list-header')");
							} else {
								innerChildNode.setAttribute('class', 'bb-lowres-inbox-list-header');
								innerChildNode.setAttribute('onmouseover', "this.setAttribute('class','bb-lowres-inbox-list-header-hover')");
								innerChildNode.setAttribute('onmouseout', "this.setAttribute('class','bb-lowres-inbox-list-header')");
							}
						}
						else if (type == 'item') {
							var description = innerChildNode.innerHTML,
								title = innerChildNode.getAttribute('data-bb-title');
							if (innerChildNode.hasAttribute('data-bb-accent') && innerChildNode.getAttribute('data-bb-accent').toLowerCase() == 'true') {
								title = '<b>' + title + '</b>';
							}
							innerChildNode.setAttribute('x-blackberry-focusable','true');
							innerChildNode.innerHTML = '<img src="'+ innerChildNode.getAttribute('data-bb-img') +'" />\n'+
											'<div class="title">'+ title +'</div>\n'+
											'<div class="time">' + innerChildNode.getAttribute('data-bb-time') + '</div>\n'+
											'<div class="description">' + description + '</div>\n';
							innerChildNode.removeAttribute('data-bb-img');
							innerChildNode.removeAttribute('data-bb-title');	
							
							if (bb.device.isHiRes) {
								innerChildNode.setAttribute('class', 'bb-hires-inbox-list-item');
								innerChildNode.setAttribute('onmouseover', "this.setAttribute('class','bb-hires-inbox-list-item-hover')");
								innerChildNode.setAttribute('onmouseout', "this.setAttribute('class','bb-hires-inbox-list-item')");
							} else {
								innerChildNode.setAttribute('class', 'bb-lowres-inbox-list-item');
								innerChildNode.setAttribute('onmouseover', "this.setAttribute('class','bb-lowres-inbox-list-item-hover')");
								innerChildNode.setAttribute('onmouseout', "this.setAttribute('class','bb-lowres-inbox-list-item')");
							}				
						}
					}				
				}			
			}	
		}
	},
	
	
	bbmBubble: {
		// Apply our transforms to all BBM Bubbles
		apply: function(elements) {
			for (var i = 0; i < elements.length; i++) {
				var outerElement = elements[i];
					
				if (outerElement.hasAttribute('data-bb-style')) {
					var style = outerElement.getAttribute('data-bb-style').toLowerCase();
					if (style == 'left')
						outerElement.setAttribute('class','bb-bbm-bubble-left');
					else
						outerElement.setAttribute('class','bb-bbm-bubble-right');
						
					var innerElements = outerElement.querySelectorAll('[data-bb-type=item]');
					for (var j = 0; j > innerElements.length; j++) {
						outerElement.removeChild(innerElements[j]);
					}
					
					// Create our new <div>'s
					var placeholder = document.createElement('div');
					placeholder.setAttribute('class','top-left image');
					outerElement.appendChild(placeholder);
					placeholder = document.createElement('div');
					placeholder.setAttribute('class','top-right image');
					outerElement.appendChild(placeholder);
					
					placeholder = document.createElement('div');
					placeholder.setAttribute('class','inside');
					outerElement.appendChild(placeholder);
					
					
					var insidePanel = document.createElement('div');
					insidePanel.setAttribute('class','nogap');
					placeholder.appendChild(insidePanel);
					
					
					placeholder = document.createElement('div');
					placeholder.setAttribute('class','bottom-left image');
					outerElement.appendChild(placeholder);
					placeholder = document.createElement('div');
					placeholder.setAttribute('class','bottom-right image');
					outerElement.appendChild(placeholder);
					// Add our previous children back to the insidePanel
					for (var j = 0; j < innerElements.length; j++) {
						var innerChildNode = innerElements[j],
							description = innerChildNode.innerHTML;
						innerChildNode.innerHTML = '<img src="'+ innerChildNode.getAttribute('data-bb-img') +'" />\n' +
								'<div class="details">'+ description +'</div>\n';
						insidePanel.appendChild(innerChildNode); 
					}
					
				}
			}	
		}
		
	},
	
}

// Load our back handler
bb.assignBackHandler(bb.popScreen);




