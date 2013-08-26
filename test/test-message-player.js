var MessagePlayer = require('../lib/MessagePlayer'),
    fs            = require('fs');

console.log('Start MessagePlayer module test');

if(!fs.existsSync('audio1.mp3') ||
   !fs.existsSync('audio2.mp3')) {
	console.log('you must have audio1.mp3 and audio2.mp3 in the test folder');
} else {
	var mp = new MessagePlayer(['audio1.mp3', 'audio2.mp3']);

	mp.RegisterCallback(function() {
		console.log('End queue of audio files');
	});

	mp.Start();
}
