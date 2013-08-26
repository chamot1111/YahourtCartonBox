/**
 * Model for a list of audio file. The module let register a callback to listen
 * changes event: MessageAdded, MessageRemoveEvent.
 */

var fs = require('fs');

var IdIncrement = 1;
function MessageItem(filePath, unread, owner, date, name) {
    this.Id = IdIncrement++;
    this.FilePath = filePath;
    this.Unread = unread;
    this.Owner = owner;
    this.Date = date;
    this.Name = name;
}

function BackupConfFile(confFile, store) {
    var content = JSON.stringify(store);
    fs.writeFileSync(confFile, content);
}

function PlayList(confFile) {
    // contains list of MessageItem
    this._Store = [];
    
    this._Callbacks = {"MessageRemoveEvent": [],
                        "MessageAdded" : []};
        
    this.ConfFile = confFile;
    // contains list of MessageItem
    if(fs.existsSync(confFile)) {
        var content = fs.readFileSync(confFile);
        this._Store = JSON.parse(content);
        // find the biggest ID
        
        for(var l = 0; l < this._Store.length; l++) {
            var mp = this._Store[l];
            if(mp.Id >= IdIncrement){
                IdIncrement = mp.Id + 1;
            }
        }
    }
}

PlayList.prototype = {
    GetAllMessages : function() {
        return this._Store;
    },
    GetUnreadMessages : function() {
        var ms = [];
        for(var i = 0; i < this._Store.length; i++) {
            var m = this._Store[i];
            if(m.Unread) {
                ms.push(m);
            }
        }
        return ms;
    },
    FindMessageById : function(messageId) {
        for(var i = 0; i < this._Store.length; i++) {
            var m = this._Store[i];
            if(m.Id == messageId) {
                return m;
            }
        }
        return null;
    },
    GetMessagesForUser : function(user, isAdmin) {
        var ms = [];
        for(var i = 0; i < this._Store.length; i++) {
            var m = this._Store[i];
            if(m.Owner == user || isAdmin) {
                ms.push(m);
            }
        }
        return ms;
    },
    FlagMessageAsRead : function(messageId) {
        var m = this.FindMessageById(messageId);
        if(m != null) {
            m.Unread = false;
            BackupConfFile(this.ConfFile, this._Store);
        } else {
            console.error("Flag message impossible: message with id " + messageId + " doesn't exist");
        }
    },
    /**
     * Callback:
     *    MessageAdded: function(messageItem) -> return none
     *    MessageRemoveEvent: function(messageItem, remover) -> return true if
     *        responsinility for the deletion is taken, false otherwise
     */
    RegisterCallback : function(eventName, callback) {
        if(eventName in this._Callbacks) {
            this._Callbacks[eventName].push(callback);
        } else {
            console.error(eventName + " is not a playlist event");
        }
    },
    RemoveMessage : function(messageId, remover, user, isAdmin) {
        for(var i = 0; i < this._Store.length; i++) {
            var m = this._Store[i];
            if(m.Id == messageId) {
                // verify autorisation
                if(m.Owner == user || isAdmin) {
                    this._Store.splice(i, 1);
                    var transmitOwnership = false;
                    for(var j = 0; j < this._Callbacks["MessageRemoveEvent"].length; j++) {
                        transmitOwnership = transmitOwnership || this._Callbacks["MessageRemoveEvent"][j](remover);
                    }
                    if(!transmitOwnership) {
                        remover();
                    }
                    BackupConfFile(this.ConfFile, this._Store);
                    return m;
                }
            }
        }
        console.error("Remove message impossible: message with id " + messageId + " doesn't exist");
        return null;
    },
    AddMessage : function(messageInfo) {
        var m = new MessageItem(messageInfo.FilePath, messageInfo.Unread, messageInfo.Owner, messageInfo.Date, messageInfo.Name);
        this._Store.push(m);
        for(var j = 0; j < this._Callbacks["MessageAdded"].length; j++) {
            this._Callbacks["MessageAdded"][j](m);
        }
        BackupConfFile(this.ConfFile, this._Store);
        return m;
    },
    GetCount : function() {
        return this._Store.length;
    }
}

module.exports = PlayList;