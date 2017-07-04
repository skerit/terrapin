var fs = require('fs'),
    Terrapin,
    Blast;

// Get an existing Protoblast instance,
// or create a new one
if (typeof __Protoblast != 'undefined') {
	Blast = __Protoblast;
} else {
	Blast = require('protoblast')(false);
}

// Get the Sentana namespace
Terrapin = Blast.Bound.Function.getNamespace('Develry.Terrapin');

// Require the main files
require('./core/browser');
require('./core/interface');
require('./core/tab');
require('./interface/casper');

// Export the entire Terrapin namespace
module.exports = Terrapin;