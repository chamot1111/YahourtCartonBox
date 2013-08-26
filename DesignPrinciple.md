YahourtCartonBox
================

This project is a carton box with a cover that play audio messages when the cover is opened by the user.
Inside the box, the hardware is based upon a rasberry pi, a wifi dongle, a webcam and a speaker.

From a software point of view, the program launch a webserver that let upload new audio files to raspberry pi. The webcam is used to detect the light coming from outside the box. When the box is detected open, the audio file is played by a command line program.

This program need a web server for file upload. [Node.js](http://nodejs.org/) seems a good choice as a programming langage.

module separation
-----------------

The program is split into 5 modules:

     |---------------------------------------------------|
     |                   Web server                      |
     |------------------------------------------|        |    
     |                     YCB                  |        |
     |------------------------------------------|--------|               
     | UserDetection | MessagePlayer |      PlayList     |
     |---------------------------------------------------| 

### User Detection

```
<<./lib/UserDetection.js>> =
	/**
	 * This module is in charge to detect the user presence, in order to launch the read of the message.
	 */
	
<<ud-require>>
	 
/**
 * callback is called when listening state just change
 * callback       function(isListening) -> return none
 */ 
function UserDetection(callback) {
	<<ud-object>>
}

UserDetection.prototype = {
	IsListening: function() {
		<<ud-is-listening>>
	}
}

module.exports = UserDetection;
```

For more details on implementation, see `UserDetection.md`.

### Message Player

```
<<./lib/MessagePlayer.js>> =
	/**
	 * This module can play a queue of audio file from a folder in the system. It uses CLI program
	 * process spawning to play the audio files. A callback is registered to alert end of playing.
	 */

<<mp-require>>

/**
 * filePathArray  array of string containing path for file (absolute or relative)
 */
function MessagePlayer(filePathArray) {
	<<mp-object>>
}

MessagePlayer.prototype = {
	Start: function() {
		<<mp-start>>
	},
	Stop: function() {
		<<mp-stop>>
	},
	IsPlaying: function() {
		<<mp-is-playing>>
	},
	/**
	 * callback       function() -> return none
	 */
	RegisterCallback: function(callback) {
		<<mp-set-callback>>
	}
}

module.exports = MessagePlayer;
 
```
For more details on implementation, see `MessagePlayer.md`.

### Play List

The play list make the link between the web server and the YCB module. The playlist module must be considered as model for the application. It's loaded from a file at startup and each change is saved to the disk.

The webserver will make changes through the playlist module. The YCB module will just listen for this changes.

To resolve the problem when a user on the web interface delete a file and the user is listening to it, we will transmit an anonymous function as an action delayer. Let's call this anonymous function a 'remover'.  When the web server want to remove a message and his file, it will call RemoveMessage on playlist with two parameters. The first is the messageId, and the other in the 'remover'. The 'remover' need only to be call without parameter to take action immediately. After the call to RemoveMessage, the web server is no more responsible of the deletion. The responsibility is transmit to the playslist module. Then the playlist module will call the registered callback for event `MessageRemoveEvent`. If one of the delegates for this event return true it take the responsibility to delete the file later thanks to the 'remover'. In the other case, the playlist module delete immediately the file.

An event `MessageAdded` will be triggered after the file has been totally downloaded and is in the folder.

This module keep track of the message already listened and not deleted.

```
<<./lib/PlayList.js>> =
/**
 * Model for a list of audio file. The module let register a callback to listen
 * changes event: MessageAdded, MessageRemoveEvent.
 */

<<pl-require>>

<<pl-private-functions>>

function PlayList(confFile) {
	<<pl-object>>
}

PlayList.prototype = {
	GetAllMessages : function() {
		<<pl-get-all-messages>>
	},
	GetUnreadMessages : function() {
		<<pl-get-unread-messages>>
	},
	FindMessageById : function(messageId) {
		<<pl-find-message>>
	},
	GetMessagesForUser : function(user, isAdmin) {
		<<pl-get-message-user>>
	},
	FlagMessageAsRead : function(messageId) {
		<<pl-flag-message-as-read>>
	},
	/**
	 * Callback:
	 *    MessageAdded: function(messageItem) -> return none
	 *    MessageRemoveEvent: function(messageItem, remover) -> return true if
	 *        responsibility for the deletion is taken, false otherwise
	 */
	RegisterCallback : function(eventName, callback) {
		<<pl-register-callback>>
	},
	RemoveMessage : function(messageId, remover, user, isAdmin) {
		<<pl-remove-message>>
	},
	AddMessage : function(messageInfo) {
		<<pl-add-message>>
	},
	GetCount : function() {
		<<pl-get-count>>
	}
}

module.exports = PlayList;
```

For more details on implementation, see `PlayList.md`.

### YCB

```
<<./lib/YCB.js>> =
	/**
	 * This module is the main loop.
	 */

<<ycb-require>>

function YCB(confFile, downloadFolder) {
	<<ycb-object>>
}

YCB.prototype = {
	StartUnstoppableSequence : function() {
		<<ycb-start-unstoppable-sequence>>
	}
}

module.exports = YCB;
```

### WebServer

The web server will be generated with the CLI express.js tool and discuss in the file `express.md`.

YCB module
----------

### Init

The init module is only the instanciation of Playlist, UserDetection and binding of their callback. 

```
<<ycb-object>> =
	this._ConfFile = confFile;
	this._DownloadFolder = downloadFolder;
	
	this._UserDetection = new UserDetection((function(self) {
		return function(isListening) {
			<<user-listen-event>>
		};
	})(this));
	this.Playlist = new PlayList(this._ConfFile, this._DownloadFolder);
	// register events MessageAdded, MessageWillBeRemovedEvent and MessageWasRemovedEvent
	this.Playlist.RegisterCallback("MessageAdded", (function(self) {
		return function(messageItem) {
			<<ycb-message-added-event>>
		}
	})(this));
	
	this.Playlist.RegisterCallback("MessageRemoveEvent", (function(self) {
		return function(messageItem, remover) {
			<<ycb-message-remove-event>>
		}
	})(this));
	
	// message player is instantiated at the demand, and when it has finished playing or has been stopped the reference is reset to null by callback
	this._MessagePlayer = null;
```

The user detection event is very simple. When the cover is open, it start playing. When it's closed, it stop playing.

```
<<user-listen-event>> =
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
```

If a message is added, we have two different cases. First we were not playing message. In this case we just look if the user is listening, and we are playing files. Second case we where playing and we must wait for the actual messages to be finished. To do that we register a corresponding callback to the message player. The callback will try to play the message, when actual messages have finished.

```
<<ycb-message-added-event>> =
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
```

If a message is removed when messages are reading, we delayed the deletion until messages have finished to play.

```
<<ycb-message-remove-event>> =
	if(self._MessagePlayer == null) {
		// delete now
		return false;
	} else {
		// remove at end of actual messages
		self._MessagePlayer.RegisterCallback(remover);
		return true;
	}
```

Finally we need to create the method that look if messages are available to read, and automate the deletion of the MessagePlayer when message have finished to read.
If there is new messages, we read only new ones.

```
<<ycb-start-unstoppable-sequence>> =
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
```

Appendix
========

```
<<ycb-require>> =
	var MessagePlayer = require("./MessagePlayer")
	  , PlayList = require("./PlayList")
	  , UserDetection = require("./UserDetection");
```

