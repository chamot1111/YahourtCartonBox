
/**
 * Module dependencies.
 */

var express = require('express')
  , fs = require('fs')
  , http = require('http')
  , path = require('path')
  , jsSHA = require('./lib/sha1.js')
  , keyGenerator = require('./lib/KeyGenerator')
  , playlistModule = require('./lib/PlayList')
  , ycbModule = require('./lib/YCB');

// TTL: 2 minutes
var saltKeyGenerator = new keyGenerator(16, 120000);
// TTL: one hour
var tokenKeyGenerator = new keyGenerator(16, 3600000);

var userStore = JSON.parse(fs.readFileSync("./conf/user.js"));

var ycb = new ycbModule("./conf/playlist.js", "./upload/");

//var playlist = new playlistModule("./conf/playlist.js");
var playlist = ycb.Playlist;

function EncryptedPassword(pass, saltKey) {
  var saltPass = pass + saltKey;
  var shaObj = new jsSHA(saltPass, "TEXT");
  return shaObj.getHash("SHA-1", "HEX");
};

function SafeDelete(filename) {
  if(fs.existsSync(filename)) {
    fs.unlink(filename, function (err) {
      if (err) 
        console.error(err);
    });
  } else {
    console.error(filename + " was already deleted");
  }
}

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.limit('20mb'));
  app.use(express.bodyParser({ keepExtensions: true, uploadDir: __dirname + '/upload' }));
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/api/saltkey', function(req, res){
  var k = saltKeyGenerator.GenerateKey(null);
  res.send({'success': 'true', 'saltKey': k});
});

app.post('/api/login', function(req, res){
  var login = req.body["login"];
  var hashPass = req.body["hash-pass"];
  var saltKey = req.body["salt-key"];
  if(login && login.length > 0 &&
     hashPass && hashPass.length > 0 &&
     saltKey && saltKey.length > 0) {
    if(saltKeyGenerator.IsKeyValid(saltKey)) {
      if(login in userStore) {
        var clearPass = userStore[login].password;
        var h = EncryptedPassword(clearPass, saltKey);
        if(h == hashPass) {
          var token = tokenKeyGenerator.GenerateKey({'login': login, 'adminRight': userStore[login].adminRight});
          res.send({'success': 'true', 'token': token});
        } else {
          res.send({'success': 'false', 'error' : 'bad login or password'});   
        }
      } else {
        res.send({'success': 'false', 'error' : 'bad login or password'}); 
      }
    } else {
      res.send({'success': 'false', 'error' : 'salt key expire'});  
    }
  } else {
    res.send({'success': 'false', 'error' : 'lack of params in the post body'});  
  }
});

function verifyToken(req, res) {
  var token = req.body["token"];
  if("token" in req.body) {
    if(tokenKeyGenerator.IsKeyValid(token)) {
      return tokenKeyGenerator.GetData(token);
    } else {
      console.log("Token expire");
      res.send({'success': 'false', 'expire-token': 'true', 'error' : 'token expire'});    
    }
  } else {
    res.send({'success': 'false', 'error' : 'token param not sended'});  
  }
  return null;
}

app.post('/api/message/list', function(req, res){
  var userData = verifyToken(req, res);
  if(userData != null) {
    var msgs = playlist.GetMessagesForUser(userData.login, userData.adminRight);
    var data = [];
    for(var i = 0; i < msgs.length; i++) {
      var msg = msgs[i];
      data.push({
        "id" : msg.Id,
        "name" : msg.Name,
        "user" : msg.Owner,
        "date" : msg.Date
      });
    }

    res.send({'success' : 'true', 'messages' : data});
  }
});

app.post('/api/message/delete', function(req, res){
  var userData = verifyToken(req, res);
  if(userData != null) {
    if("message-id" in req.body) {
      var m = playlist.FindMessageById(req.body["message-id"]);
      if(m != null) {
        var remover = (function(fn) { return function() { SafeDelete(fn); }; })(m.FilePath);
        if(playlist.RemoveMessage(req.body["message-id"], remover, userData.login, userData.adminRight) != null) {
          res.send({'success': 'true'});
        } else {
          res.send({'success': 'false', 'error' : 'not authorized to delete this message'});
        }
      } else {
        // don't give more information (security)
        res.send({'success': 'false', 'error' : 'not authorized to delete this message'});
      }
    } else {
      res.send({'success': 'false', 'error' : 'message-id param not sended'});
    }
  }
});

app.post('/api/message/send', function(req, res){
  var userData = verifyToken(req, res);
  if(userData != null) {
    if("message" in req.files) {
      if(playlist.GetCount() < 10) {
        var f = req.files["message"];
        var msg = playlist.AddMessage({
          "FilePath" : f.path, 
          "Unread" : true, 
          "Owner" : userData.login, 
          "Date" : new Date().toString(), 
          "Name" : f.name
        });
        res.send({'success': 'true', 'message' : {
          "id" : msg.Id,
          "name" : msg.Name,
          "user" : msg.Owner,
          "date" : msg.Date
        }});
        return;
      } else {
        res.send({'success': 'false', 'error' : 'too much messages'});
      }
    } else {
      res.send({'success': 'false', 'error' : 'message file not in the POST'});
    }
  }
  if("message" in req.files) {
    var f = req.files["message"];
    SafeDelete(f.path);
  }
  
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
