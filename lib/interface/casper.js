var Blast       = __Protoblast,
    readline    = require('readline'),
    libchild    = require('child_process'),
    libpath     = require('path'),
    Fn          = Blast.Bound.Function,
    JSON        = Blast.Bound.JSON,
    callback_id = 1,
    instances   = [],
    Terrapin;

// Get the Terrapin namespace
Terrapin = Blast.Bound.Function.getNamespace('Develry.Terrapin');

/**
 * The Casper Interface
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 *
 * @param    {Develry.Terrapin.Browser}   browser
 */
var Casper = Fn.inherits('Develry.Terrapin.Interface.Interface', function Casper(browser) {

	// Callbacks to do
	this.callbacks = {};

	// Command queue
	this.queue = [];

	Casper.super.call(this, browser);

	this.createInstance();
});

/**
 * See if this interface is available
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Casper.setStatic(function testAvailability(callback) {
	libchild.execFile('phantomjs', ['--version'], function done(err, stdout, stderr) {

		if (err) {
			return callback(null, false);
		}

		let output = parseInt(''+stdout);

		if (output >= 1) {
			callback(null, true);
		} else {
			callback(null, false);
		}
	});
});

/**
 * Create a casper browser
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Casper.setMethod(function createInstance(callback) {

	var that = this,
	    remote_file = libpath.resolve(__dirname, 'casper_remote.js'),
	    instance,
	    noop_id,
	    rl;

	// Create the new instance
	instance = libchild.spawn('phantomjs', [remote_file]);

	// Set the correct encoding
	instance.stdin.setDefaultEncoding('utf-8');

	// Store it in the instances array
	instances.push(instance);

	rl = readline.createInterface({
		input  : instance.stdout
	});

	rl.on('line', function gotLine(message) {

		var obj,
		    i;

		if (message == 'READ') {

			if (that.queue.length) {
				while (that.queue.length) {
					instance.stdin.write(that.queue.shift());
					instance.stdin.write('\n');
				}
			} else {
				instance.stdin.write('NOOP\n');
			}

			return;
		}

		try {
			obj = JSON.undry(message);
		} catch (err) {
			console.log('Unknown Casper message: ' + message);
			return;
			//return that.emit('error', err);
		}

		if (obj.callback_id != null && that.callbacks[obj.callback_id]) {
			try {
				console.log('Applying ' + that.callbacks[obj.callback_id]);
				that.callbacks[obj.callback_id].apply(that, obj.arguments);
				console.log('done')
			} catch (err) {
				that.emit('error', err);
			}
			delete that.callbacks[obj.callback_id];
		}

		if (obj.event && obj.tab_id != null) {
			that.emitOnTab(obj.tab_id, obj.event, obj.args);
		}

	});

	this.instance = instance;
});

/**
 * Send a command to casper
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Casper.setMethod(function sendToCasper(packet, callback) {

	var that = this,
	    dried,
	    id;

	// Store the callback for when we get the response
	id = callback_id++;
	this.callbacks[id] = callback;

	packet.callback_id = id;

	// Stringify it using json dry
	dried = Terrapin.Browser.dry(packet);

	this.queue.push(dried);
});

/**
 * Open a new tab
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Casper.setMethod(function openTab(callback) {

	this.sendToCasper({
		type: 'command',
		command : 'openTab'
	}, callback);

});

/**
 * Open the url in the specified tab
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Casper.setMethod(function openTabUrl(tab_id, url, callback) {

	this.sendToCasper({
		type      : 'command',
		command   : 'openTabUrl',
		arguments : [tab_id, url]
	}, callback);

});