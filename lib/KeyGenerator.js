   
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
   