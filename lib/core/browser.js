var instances       = [],
    Terrapin,
    Blast           = __Protoblast,
    Fn              = Blast.Bound.Function;

// Get the Sentana namespace
Terrapin = Blast.Bound.Function.getNamespace('Develry.Terrapin');

/**
 * The Terrapin Browser Class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
var Browser = Fn.inherits('Informer', 'Develry.Terrapin', function Browser(options) {

	// Browser options
	this.options = options || {};

	// Create the actual interface
	this._createInterface();
});

/**
 * Destroy all instances
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Browser.setStatic(function destroyAll() {
	var i;

	for (i = instances.length - 1; i >= 0; i--) {
		instances[i].instance.kill();
	}
});

/**
 * Dry something with function support
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 *
 * @param    {Mixed}   value
 *
 * @return   {String}
 */
Browser.setStatic(function dry(value) {

	return Blast.Bound.JSON.dry(value, function replacer(key, val) {

		if (typeof val == 'function') {
			let source = String(val);

			val = {
				dry   : 'Function',
				value : {
					name      : val.name,
					arguments : Blast.Collection.Function.getArgumentNames(source),
					body      : source.slice(source.indexOf('{') + 1, -1)
				}
			};
		}

		return val;
	});
});

/**
 * The interface property
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Browser.setProperty(function interface() {
	return this._interface;
}, function set_interface(interface) {
	this._interface = interface;
	this.emit('interface_set');
});

/**
 * RCreate an interface
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Browser.setMethod(function _createInterface() {

	var that = this,
	    Interfaces,
	    preference,
	    result,
	    tasks,
	    key;

	// Get the Interface namespace
	Interfaces = Blast.Classes.Develry.Terrapin.Interface;

	// Get the optional prefered interface
	preference = this.options.interface;

	if (preference) {
		preference = preference.toLowerCase();

		for (key in Interfaces) {
			if (key.toLowerCase() == preference) {
				this.interface = new Interfaces[key](this);
				return;
			}
		}
	}

	tasks = [];

	for (let key in Interfaces) {

		if (key == 'Interface') {
			continue;
		}

		let Interface = Interfaces[key];

		tasks.push(function testAvailability(next) {
			Interface.testAvailability(function tested(err, available) {

				if (err || !available) {
					return next(null, false);
				}

				next(null, Interface);
			});
		});
	}

	Fn.parallel(tasks, function done(err, result) {

		if (err) {
			return that.emit('error', err);
		}

		let i;

		for (i = 0; i < result.length; i++) {
			if (result[i]) {
				that.interface = new result[i](that);
				return;
			}
		}
	});
});

/**
 * Open a new tab
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Browser.setMethod(function openTab() {
	return new Terrapin.Tab(this);
});