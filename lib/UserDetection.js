    /**
     * This module is in charge to detect the user presence, in order to launch the read of the message.
     */
    
var spawn  = require('child_process').spawn,
    PNG    = require('png-js'),
    timers = require('timers');
    
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
     
/**
 * callback is called when listening state just change
 * callback       function(isListening) -> return none
 */
function UserDetection(callback) {
    this._isListening = false;
    var self = this;
    timers.setInterval(function() {
        self._childProcess = spawn('raspistill', ["-t", "0", "-n", "-w", "32", "-h", "32", "-e", "png", "-o", "/tmp/test.png"]);
        self._childProcess.on('close', function (code) {
              self._childProcess = null;
              PNG.decode("/tmp/test.png", function(pixels) {
                  var listenState = self._isListening;
                  self._isListening = isLightPresent(pixels, 32, 32);
                  if(listenState != self._isListening) {
                      console.log("Box opened? " + ((self._isListening)? "yes" : "no"));
                        callback(self._isListening);
                    }
              });
        });
    }, 3000);
}

UserDetection.prototype = {
    IsListening: function() {
        return this._isListening;
    }
}

module.exports = UserDetection;