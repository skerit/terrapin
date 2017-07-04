var Blast       = __Protoblast,
    libchild    = require('child_process'),
    libpath     = require('path'),
    Fn          = Blast.Bound.Function,
    callback_id = 0,
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

	this.callbacks = {};

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
	libchild.execFile('casperjs', ['--version'], function done(err, stdout, stderr) {

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
	    instance;

	// Create the new instance
	instance = libchild.spawn('casperjs', [remote_file], {env: process.env});

	// Set the correct encoding
	instance.stdin.setDefaultEncoding('utf-8');

	// Store it in the instances array
	instances.push(instance);

	instance.stdout.on('data', function onData(data) {

		var message = data.toString('utf8');

		console.log('INSTANCE MESSAGE:', message);

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

	// Write to the casper stdin
	this.instance.stdin.write(dried);
	this.instance.stdin.write('\n');
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
	}, function gotTab(err, result) {
		console.log('Got tab:', err, result);
	});

});