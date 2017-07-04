var Terrapin,
    Blast           = __Protoblast,
    Fn              = Blast.Bound.Function;

// Get the Terrapin namespace
Terrapin = Blast.Bound.Function.getNamespace('Develry.Terrapin');

/**
 * The Interface Browser Class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 *
 * @param    {Develry.Terrapin.Browser}   browser
 */
var Interface = Fn.inherits('Informer', 'Develry.Terrapin.Interface', function Interface(browser) {

	this.browser = browser;

});

/**
 * See if this interface is available
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Interface.setStatic(function testAvailability(callback) {
	return callback(new Error('Availability test has not been implemented in ' + this.name));
});

/**
 * Open a new tab
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Interface.setMethod(function openTab(callback) {
	return callback(new Error('openTab has not been implemented in ' + this.name));
});