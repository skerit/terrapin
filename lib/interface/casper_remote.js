var Webpage = require('webpage'),
    system = require('system'),
    remote,
    tab_id = 1,
    Blast  = require('protoblast')(true),
    rl;

JSON.registerDrier('Function', function dryFunction(holder, key, value) {

	var source = String(value);

	return {
		name      : value.name,
		arguments : Blast.Collection.Function.getArgumentNames(source),
		body      : source.slice(source.indexOf('{') + 1, -1)
	};

}, {add_path: false});

JSON.registerUndrier('Function', function undryFunction(holder, key, value) {

	var result;

	eval('result = function ' + value.name + '(' + value.arguments + ') {' + value.body + '}');

	return result;
});

/**
 * The Remote Class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
var Remote = Function.inherits('Informer', 'Develry.Terrapin', function Remote() {

	// The open tabs
	this.tabs = {};

	// Start reading the stdin
	this.startRead();
});

/**
 * Start reading the stdin
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Remote.setMethod(function startRead() {

	var that = this;

	setTimeout(function read() {
		var callback,
		    had_work,
		    packet,
		    line;

		system.stdout.writeLine('READ');
		line = system.stdin.readLine();

		if (!line || line == 'NOOP') {
			setTimeout(read, 200);
			return;
		}

		try {
			packet = JSON.undry(line);
		} catch (err) {
			// Not much that can be done now...
			setTimeout(read, 100);
			return;
		}

		callback = function callback() {
			var args = Array.prototype.slice.call(arguments);

			that.sendToTerrapin({
				type        : 'callback',
				callback_id : packet.callback_id,
				arguments   : args
			});
		};

		try {
			that.handlePacket(packet, callback);
		} catch (err) {
			callback(err);
		}

		// Packet was found, so do another one ASAP
		setTimeout(read, 4);
	}, 100);
});

/**
 * Do instance command
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Remote.setMethod(function exec(method) {

	var that = this,
	    callback,
	    args = [],
	    i;

	for (i = 1; i < arguments.length; i++) {
		args.push(arguments[i]);
	}

	if (typeof args[args.length - 1] == 'function') {
		callback = args.unshift();
	}

	if (!callback) {
		callback = Function.thrower;
	}

	that.afterOnce('instance_ready', function instanceIsReady() {
		var result;

		try {
			result = that.instance[method].apply(that.instance, args);
		} catch (err) {
			return callback(err);
		}

		callback(null, result);
	});
});

/**
 * Send to terrapin
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Remote.setMethod(function sendToTerrapin(data) {

	var dried;

	try {
		dried = JSON.dry(data);
		system.stdout.writeLine(dried);
	} catch (err) {
		console.log('ERR: ' + err)
		// Ignore
	}
});

/**
 * Handle a packet
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Remote.setMethod(function handlePacket(packet, callback) {

	var that = this;

	if (packet.type == 'command') {
		if (typeof this[packet.command] == 'function') {
			if (Array.isArray(packet.arguments)) {
				packet.arguments.push(callback);
				this[packet.command].apply(this, packet.arguments);
			} else {
				this[packet.command](callback);
			}
		} else {
			callback(new Error('Command ' + packet.data.command + ' does not exist'));
		}
	} else {
		console.log('Unknown packet')
	}
});

/**
 * Open a new tab
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Remote.setMethod(function openTab(options, callback) {

	var that = this,
	    id;

	if (typeof options == 'function') {
		callback = options;
		options = null;
	}

	if (!options) {
		options = {};
	}

	id = tab_id++;

	// Create the new tab instance
	tab = Webpage.create();

	// Save the tab for later
	this.tabs[id] = tab;

	// Add a send wrapper
	tab.sendToTerrapin = function sendToTerrapin(data) {
		data.tab_id = id;
		that.sendToTerrapin(data);
	};

	// Add the callback listener
	tab.onCallback = function onCallback(data) {
		if (data.event) {
			tab.sendToTerrapin(data);
		}
	};

	// Listen for the loading to start
	tab.onLoadStarted = function onLoadStarted() {
		tab.sendToTerrapin({
			event : 'loadStarted'
		});
	};

	// Listen to network activity
	tab.onResourceReceived = function onResourceReceived(response) {
		tab.sendToTerrapin({
			event : 'resourceReceived',
			args  : [response]
		});
	};

	// Listen to url changes
	tab.onUrlChanged = function onUrlChanged(target_url) {
		tab.sendToTerrapin({
			event : 'urlChanged',
			args  : [target_url]
		});
	};

	callback(null, id);
});

/**
 * Open the url in the specified tab
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Remote.setMethod(function openTabUrl(tab_id, url, callback) {

	var that = this,
	    options,
	    tab = this.tabs[tab_id];

	if (!tab_id) {
		return callback(new Error('This tab does not exist'));
	}

	if (url && typeof url == 'object') {
		options = url;
		url = options.href || options.url;
	} else {
		options = {};
	}

	if (!options.operation) {
		options.operation = 'GET';
	}

	// Wait for the load to finish:
	// This does NOT mean the page is ready!
	tab.onLoadFinished = function onFinished(status) {

		tab.evaluate(function() {

			var last_change = Date.now(),
			    last_state = document.readyState;

			setTimeout(function checkReadyState() {

				var now = Date.now(),
				    diff = now - last_change;

				// If the state changed in the last 3 seconds,
				// then wait another 2 seconds
				if (diff < 3000) {
					return setTimeout(checkReadyState, 2000);
				}

				if (document.readyState != 'complete') {
					return setTimeout(checkReadyState, 2000);
				}

				window.callPhantom({event: 'DOMContentLoaded'});
			}, 1000);

			document.addEventListener('readystatechange', function onReadyStateChange(event) {
				last_change = Date.now();
				last_state = document.readyState;
			});

			window.addEventListener('load', function onWindowLoad(event) {
				window.callPhantom({event : 'load'});
			});
		});

		callback(null, status);
	};

	tab.open(url, options);
});

remote = new Remote();
