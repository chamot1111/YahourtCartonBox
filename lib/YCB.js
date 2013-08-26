    /**
     * This module is the main loop.
     */

var MessagePlayer = require("./MessagePlayer")
  , PlayList = require("./PlayList")
  , UserDetection = require("./UserDetection");

function YCB(confFile, downloadFolder) {
    this._ConfFile = confFile;
    this._DownloadFolder = downloadFolder;
    
    this._UserDetection = new UserDetection((function(self) {
        return function(isListening) {
            if(isListening) {
                // start playing
                if(self._MessagePlayer == null) {
                    self.StartUnstoppableSequence();
                } else {
                    console.error("user-listen-event: impossible sequence");
                }
            } else {
                // stop playing immediately
                if(self._MessagePlayer != null) {
                    self._MessagePlayer.Stop();
                }
            }
        };
    })(this));
    this.Playlist = new PlayList(this._ConfFile, this._DownloadFolder);
    // register events MessageAdded, MessageWillBeRemovedEvent and MessageWasRemovedEvent
    this.Playlist.RegisterCallback("MessageAdded", (function(self) {
        return function(messageItem) {
            if(self._MessagePlayer == null) {
                // play messages
                if(self._UserDetection.IsListening()) {
                    self.StartUnstoppableSequence();
                }
            } else {
                // try at end of actual messages
                self._MessagePlayer.RegisterCallback((function(self) {
                    return function() {
                        if(self._MessagePlayer == null) {
                            if(self._UserDetection.IsListening()) {
                                self.StartUnstoppableSequence();
                            }
                        }
                    };
                })(self))
            }
        }
    })(this));
    
    this.Playlist.RegisterCallback("MessageRemoveEvent", (function(self) {
        return function(messageItem, remover) {
            if(self._MessagePlayer == null) {
                // delete now
                return false;
            } else {
                // remove at end of actual messages
                self._MessagePlayer.RegisterCallback(remover);
                return true;
            }
        }
    })(this));
    
    // message player is instantiated at the demand, and when it has finshed playing or has been stopped the reference is reset to null by callback
    this._MessagePlayer = null;
}

YCB.prototype = {
    StartUnstoppableSequence : function() {
        var messages = null;
        var unreadMessages = this.Playlist.GetUnreadMessages();
        if(unreadMessages.length > 0) {
            messages = unreadMessages;
        } else {
            messages = this.Playlist.GetAllMessages();
        }
        if(messages.length > 0) {
            // create array of path
            var filePathArray = [];
            for(var i = 0; i < messages.length; i++) {
                var m = messages[i];
                filePathArray.push(m.FilePath);
            }
            this._MessagePlayer = new MessagePlayer(filePathArray);
            this._MessagePlayer.RegisterCallback((function(self) {
                return function() {
                    self._MessagePlayer = null;
                };
            })(this));
            this._MessagePlayer.Start();
        }
    }
}

module.exports = YCB;