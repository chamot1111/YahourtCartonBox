WebServer
=========


We use express.js for the server.

First install express with command:

```
npm install -g express
```

Then in the up folder of the project:

```
express --sessions --ejs YahourtCartonBox
```

It creates automatically: 

```
   create : YahourtCartonBox
   create : YahourtCartonBox/package.json
   create : YahourtCartonBox/app.js
   create : YahourtCartonBox/public
   create : YahourtCartonBox/public/javascripts
   create : YahourtCartonBox/public/images
   create : YahourtCartonBox/routes
   create : YahourtCartonBox/routes/index.js
   create : YahourtCartonBox/routes/user.js
   create : YahourtCartonBox/public/stylesheets
   create : YahourtCartonBox/public/stylesheets/style.css
   create : YahourtCartonBox/views
   create : YahourtCartonBox/views/index.ejs
```

First of all we delete the folder YahourtCartonBox/routes/.

We limit the server to serve static content and JSON api. The web application would we written in `Ember.js`. 

Here is the hierarchy of JSON api:

```
|- api
   |- saltkey: get a salt key to encode the password
   |- login: obtain a token from the login and the hashed password
   |- message
      |- send: send a new audio message
      |- delete: delete an audio message
      |- list: list all the audio messages
```

Authentification
----------------

```
      server                                                     client

/api/saltkey             <--------------------------     
                                  salt key
                         --------------------------> 
                                                         1 - concatenate password 
                                                            with salt key
                                                         2 - hash with SHA-1 algorithm
                                                            the salted password
                              login + salt key + 
                            hashed salted password
/api/login               <--------------------------
hash the password
with the same salt key
and compare the two
                                   token
                         --------------------------> 
                                                         use the token for each
                                                         api call from now
```

### Why a hash password and a salt key?

If we transfer the directly password on the network, a man in the middle can listen the communication and have the password. To avoid this we hashed the password before we transmit on the network. When the server received the hash password, it make the same operation and compare with the received hash password.

It resolve the fact that the man in the middle don't get the clear password, but it don't avoid him to connect to the service. Since he gets the hash password, it can connect to the service. Now we add the salt key. Each time a client want to connect, the server generate a random key. This key is send in clear through the network. Now before to hash the password, the client concatenate the password with the salt key. As from now, the hash salt password change every connection. If the man in the middle steal it, he can use it for the session time but it can't connect any time he wants.

The salt key must have a time to live, because  if we can generate the salted hash password with any salt key, it becomes useless.

Function used to create hashed salted password on the server and client side:

```
   function EncryptedPassword(pass, saltKey) {
      var saltPass = pass + saltKey;
      var shaObj = new jsSHA(saltPass, "TEXT");
      return shaObj.getHash("SHA-1", "HEX");
   };
```

_Warning_: This technique is not sufficient for complete security. For example the server don't keep password in clear, just an hash. But as we have only few users and that we can't get sensitive information, we use password in clear for simplicity.

### Salt key generator

   We make it more general than salt key generator because it's the same functionality than the token generator. We just add the possibility to associate data to a key.

   We just use a hashmap to store the generated as key and the creation time as value. And we launch a cleaner function every 10 seconds to clean old keys.

```
<<./lib/KeyGenerator.js>> =

   /**
    * The keys generated are hexadecimal string.
    * keyLength     length of the key string
    * ttl           time to live in milliseconds
    */
   function KeyGenerator(keyLength, ttl) {
      var self = this;

      this._Keys = {};
      this._KeyLength = keyLength;

      function clean() {
         var actualTime = new Date().getTime();
         var deleteKeys = [];
         for(var k in self._Keys)  {
            if (self.hasOwnProperty(k)) {
               var t = self._keys[k].time;
               if(actualTime - t > ttl) {
                  // time to leave 2 minutes
                  deleteKeys.push(k);
               }
            }
         }

         for(var i = 0; i < deleteKeys.length; i++) {
            delete self._Keys[deleteKeys[i]];
         }
      }

      setInterval(clean, 10000);
   }

   KeyGenerator.prototype = {
      GenerateKey: function(data) {
         var k = "";
         while(k.length < this._KeyLength) {
            k = k + Math.random().toString(16).substring(2);
         }
         k = k.substr(0, this._KeyLength);
         this._Keys[k] = {
            'time': new Date().getTime(),
            'data': data
         };
         return k;
      },
      IsKeyValid: function(key) {
         return key in this._Keys;
      },
      GetData: function(key) {
         if(key in this._Keys)
         {
            return this._Keys[key].data;
         }
         return null;
      }
   };

   module.exports = KeyGenerator;

```

### User Database

For this small project we consider a few user for each Yahourt Carton Box. For simplicity reason, we use a JSON file to store the user information. The root is a hash map where all key is a login:

```
<<./conf/user.js>> =
{
   "admin": {
      "password": "ycb",
      "adminRight": "true"
   }
}
```
The admin right let a user see and delete all messages. To read this file we just use use `JSON.parse(fs.readFileSync("./conf/user.js"))`.
