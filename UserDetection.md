Message Player
==============

We use the camera to take a picture every 2 seconds. We use the `raspistill` command line tool. 

raspistill -t 0 -n -w 32 -h 32 -e png -o /tmp/test.png

When the picture has been taken, we load the png file with the `png-js`module. We analyze the picture to find if there is the mean value is above a threshold.

If there is no light, the box is closed and therefore nobody is listening.

First we must capture picture:

```
<<capture picture>> = 
	self._childProcess = spawn('raspistill', ["-t", "0", "-n", "-w", "32", "-h", "32", "-e", "png", "-o", "/tmp/test.png"]);
	self._childProcess.on('close', function (code) {
	 	 self._childProcess = null;
	 	 <<decode-image>>
	});
```

Then we use png-js to decode the image.

```
<<decode-image>> =
	PNG.decode("/tmp/test.png", function(pixels) {
		var listenState = self._isListening;
    	self._isListening = isLightPresent(pixels, 32, 32);
    	if(listenState != self._isListening) {
    		console.log("Box opened? " + ((self._isListening)? "yes" : "no"));
	 	 	callback(self._isListening);
	 	 }
	});
```

Now we just have to write the isLightPresent function. The parameter *pixels* is a 1D array, where each pixel take 4 indexes: R, G, B , A. Each value is between 0 - 255.

```
<<isLightPresent>> =
	function isLightPresent(pixels, w, h) {
		var total = 0;
		var pxlCount = w * h;
		var ind = 0;
		for(var i = 0; i < pxlCount; i++) {
			var s = pixels[ind];
			ind++;
			s += pixels[ind];
			ind++;
			s += pixels[ind];
			ind++;
			ind++; // skip alpha channel

			total += s;
		}

		var mean = total / pxlCount;
		var lightThreshold = ('LIGHT_THRESHOLD' in process.env)? process.env.LIGHT_THRESHOLD : 50;
		return mean > lightThreshold;
	}
```

Now we just need to wrap the capture in an interval loop every 3 seconds.

```
<<ud-object>> =
	this._isListening = false;
	var self = this;
	timers.setInterval(function() {
		<<capture picture>>
	}, 3000);
```

Appendix
========

```
<<ud-require>> =
	var spawn  = require('child_process').spawn,
	    PNG    = require('png-js'),
	    timers = require('timers');

	<<isLightPresent>>
```



```
<<ud-is-listening>> =
	return this._isListening;
```