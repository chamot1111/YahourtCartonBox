var UserDetection = require('../lib/UserDetection');

console.log('Start UserDetection module test');

var ud = new UserDetection(function(isListening) {
	if(isListening) {
		console.log('Box is opened');
	} else {
		console.log('Box is closed');
	}
});
