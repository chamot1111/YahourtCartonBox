#DEBUG_SYMBOL=-c //
DEBUG_SYMBOL=

all: app

# app

app: DesignPrinciple.md MessagePlayer.md Playlist.md UserDetection.md WebServer.md
	mdlp $(DEBUG_SYMBOL) DesignPrinciple.md MessagePlayer.md Playlist.md UserDetection.md WebServer.md

# clean

distclean:
	rm -f ./lib/KeyGenerator.js
	rm -f ./lib/MessagePlayer.js
	rm -f ./lib/PlayList.js
	rm -f ./lib/KeyGenerator.js
	rm -f ./lib/UserDetection.js
	rm -f ./lib/YCB.js
	rm -f ./conf/user.js
	rm -f ./conf/playlist.js
	rm -rf node_modules/
