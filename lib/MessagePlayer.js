    /**
     * This module can play a queue of audio file from a folder in the system. It uses CLI program
     * process spawning to play the audio files. A callback is registered to alert end of playing.
     */

var spawn = require('child_process').spawn;

/**
 * filePathArray  array of string containing path for file (absolute or relative)
 */
function MessagePlayer(filePathArray) {
    this._filePathArray = filePathArray;
    this._childProcess = null;
    // init the callbacks array
    this._callbacks = [];
}

MessagePlayer.prototype = {
    Start: function() {
        var self = this;
        if( !this.IsPlaying() ) {
            this._childProcess = spawn('mpg321', this._filePathArray);
            this._childProcess.on('close', function (code) {
                  self._childProcess = null;
                 // call all the callbacks
                 for(var i = 0; i < self._callbacks.length; i++) {
                     var c = self._callbacks[i];
                     c(self);
                 }
            });
        }
    },
    Stop: function() {
        if( this.IsPlaying() ) {
            this._childProcess.kill();
            this._childProcess = null;
            // call all the callbacks
            for(var i = 0; i < this._callbacks.length; i++) {
                var c = this._callbacks[i];
                c(this);
            }
        }
    },
    IsPlaying: function() {
        return this._childProcess != null;
    },
    /**
     * callback       function() -> return none
     */
    RegisterCallback: function(callback) {
        // add a new callback to the list
        this._callbacks.push(callback);
    }
}

module.exports = MessagePlayer;
 