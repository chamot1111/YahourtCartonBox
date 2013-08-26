Message Player
==============

The message player take an array of path. It's then responsible to play sequentially all these files. We use mpg321 command line tool for that purpose.

Node.js has a module `child_process`. We can launch mpg321 program and if the stop command is called we kill the child process.

Warning: On my raspberry pi board the analog output make a lots of noise.



```
<<mp-start>> =
	var self = this;
	if( !this.IsPlaying() ) {
		this._childProcess = spawn('mpg321', this._filePathArray);
		this._childProcess.on('close', function (code) {
		 	 self._childProcess = null;
			 <<mp-call-calbacks>>
		});
	}
```


When we stop the player, we just kill the process. And we must alert all the listener that the player just finished to play.

```
<<mp-stop>> =
	if( this.IsPlaying() ) {
		this._childProcess.kill();
		this._childProcess = null;
	    // call all the callbacks
	    for(var i = 0; i < this._callbacks.length; i++) {
	        var c = this._callbacks[i];
	        c(this);
	    }
	}
```



```
<<mp-is-playing>> =
	return this._childProcess != null;
```



```
<<mp-object>> =
    this._filePathArray = filePathArray;
	this._childProcess = null;
```

The user of this module has the possibility to register a callback for the end of play event.

```
<<mp-set-callback>> =
	// add a new callback to the list
	this._callbacks.push(callback);
```

```
<<mp-call-calbacks>> =
	// call all the callbacks
	for(var i = 0; i < self._callbacks.length; i++) {
		var c = self._callbacks[i];
		c(self);
	}
```

```
<<mp-object>> +=
	// init the callbacks array
	this._callbacks = [];
```

Appendix
========

```
<<mp-require>> =
	var spawn = require('child_process').spawn;
```
