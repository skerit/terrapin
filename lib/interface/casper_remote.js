var Casper = require('casper'),
    system = require('system'),
    remote,
    tab_id = 0,
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

	// Start the instance
	this.startInstance();

	// Start reading the stdin
	this.startRead();
});

/**
 * Start the casper instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Remote.setMethod(function startInstance() {

	var that = this;

	// The casper instance
	this.instance = Casper.create();

	// Wait for it to be ready
	this.instance.start().then(function done() {
		console.log('Ready?')
		that.emit('instance_ready');
	}).catch(function onError(err) {
		console.log('ERR: ' + err);
	});
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
		var line = system.stdin.readLine(),
		    callback,
		    packet;

		if (line) {

			try {
				packet = JSON.undry(line);
			} catch (err) {
				// Not much that can be done now...
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
				that.handlePacket(packet);
			} catch (err) {
				callback(err);
			}

			// When something was found, do another read ASAP
			return setTimeout(read, 0);
		}

		// No data found, so add a little timeout
		setTimeout(read, 100);
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

	console.log('sending...')

	try {
		dried = JSON.dry(data);
		system.stdout.write(dried);

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
Remote.setMethod(function openTab(callback) {

	var id;

	id = tab_id++;

	this.exec('newPage', function gotTab(err, tab) {

		if (err) {
			return callback(err);
		}

		that.tabs[id] = tab;
		callback(null, id);
	});
});

remote = new Remote();

