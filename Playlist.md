Playlist module
===============

```
<<pl-private-functions>> =
	var IdIncrement = 1;
```

```
<<pl-private-functions>> += 
	function MessageItem(filePath, unread, owner, date, name) {
		this.Id = IdIncrement++;
		this.FilePath = filePath;
		this.Unread = unread;
		this.Owner = owner;
		this.Date = date;
		this.Name = name;
	}
	
```
For best performance, when we want access a message by this id, we must use a hashMap with id as keys. But as we should have less than 5 messages in the playlist, we use a linear search.

```
<<pl-private-functions>> +=
	function BackupConfFile(confFile, store) {
		var content = JSON.stringify(store);
		fs.writeFileSync(confFile, content);
	}
```

```
<<pl-object>> =
	// contains list of MessageItem
	this._Store = [];
	
	this._Callbacks = {"MessageRemoveEvent": [],
						"MessageAdded" : []};

	this.ConfFile = confFile;
```

When the playlist object is initialized, it loads thestore from a conf file:

```
<<./conf/playlist.js>> =
	[]

```

```
<<pl-object>> +=
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
```

```
<<pl-find-message>> =
	for(var i = 0; i < this._Store.length; i++) {
		var m = this._Store[i];
		if(m.Id == messageId) {
			return m;
		}
	}
	return null;
```

```
<<pl-get-all-messages>> =
	return this._Store;
```

```
<<pl-get-message-user>> = 
	var ms = [];
	for(var i = 0; i < this._Store.length; i++) {
		var m = this._Store[i];
		if(m.Owner == user || isAdmin) {
			ms.push(m);
		}
	}
	return ms;
```

```
<<pl-get-unread-messages>> =
	var ms = [];
	for(var i = 0; i < this._Store.length; i++) {
		var m = this._Store[i];
		if(m.Unread) {
			ms.push(m);
		}
	}
	return ms;
```
We don't have any event related for flag message change. We just change the message flag.

```
<<pl-flag-message-as-read>> =
	var m = this.FindMessageById(messageId);
	if(m != null) {
		m.Unread = false;
		BackupConfFile(this.ConfFile, this._Store);
	} else {
		console.error("Flag message impossible: message with id " + messageId + " doesn't exist");
	}
```

```
<<pl-register-callback>> =
	if(eventName in this._Callbacks) {
		this._Callbacks[eventName].push(callback);
	} else {
		console.error(eventName + " is not a playlist event");
	}
```

```
<<pl-remove-message>>=
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
```

```
<<pl-add-message>> =
	var m = new MessageItem(messageInfo.FilePath, messageInfo.Unread, messageInfo.Owner, messageInfo.Date, messageInfo.Name);
	this._Store.push(m);
	for(var j = 0; j < this._Callbacks["MessageAdded"].length; j++) {
		this._Callbacks["MessageAdded"][j](m);
	}
	BackupConfFile(this.ConfFile, this._Store);
	return m;
```

```
<<pl-get-count>> =
	return this._Store.length;
```

```
<<pl-require>> =
	var fs = require('fs');
```