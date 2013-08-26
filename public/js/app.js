App = Ember.Application.create();

App.Router.map(function() {
  this.route('list');
});

App.IndexRoute = Ember.Route.extend({
	redirect: function() {
	  	var t = CookieGetToken()
	  	if(t.length > 0) {
	  		App.ConnectionToken = t;
	  		this.transitionTo('list');
	  	}
	}
});

App.ListRoute = Ember.Route.extend({
	redirect: function() {
	  	var t = CookieGetToken();
	  	if(t == "") {
	  		App.ConnectionToken = "";
	  		CookieSetToken("");
	  		this.controllerFor('list').set('errorMessage', '');
	  		this.transitionTo('index');
	  	}
	},
	model: function(params) {
	    var self = this;

	    return App.Ajax('api/message/list', {'token': App.ConnectionToken}, 'POST').then(function(jsCt) {
	    	if('messages' in jsCt) {
	    		return jsCt['messages'];
	    	} else {
	    		RSVP.reject("list webservice: messages is not in the response");
	    	}
	    }).then(null, function(error) {
	    	self.controllerFor('list').set('errorMessage', error);
	    });
	}
});


function CookieSetToken(token) {
	var today = new Date(); 
	var expires = new Date();
    expires.setTime(today.getTime() + (60*60*1000));
    document.cookie = "token=" + encodeURIComponent(token) + ";expires=" + expires.toGMTString();
}

function CookieGetToken() {
	if (navigator.cookieEnabled) {
        var cookContent = document.cookie
        var cookEnd
        var sName = "token=";
  		var j;

        for (var i = 0; i < cookContent.length; i++) {
                j = i + sName.length;
                if (cookContent.substring(i, j) == sName) {
                        cookEnd = cookContent.indexOf(";", j);
                        if (cookEnd == -1) {
                                cookEnd = cookContent.length;
                        }
                        return decodeURIComponent(cookContent.substring(j, cookEnd));
                }
        } 
	}
	return "";
}

function EncryptedPassword(pass, saltKey) {
	var saltPass = pass + saltKey;
	var shaObj = new jsSHA(saltPass, "TEXT");
	return shaObj.getHash("SHA-1", "HEX");
};

function ProgressHandlingFunction(e){
    if(e.lengthComputable){
        $('progress').attr({value:e.loaded,max:e.total});
        var percent = Math.round(e.loaded / e.total * 100.0);
        $('#upload-progress').css( "width", percent + "%" );
    }
}

App.ConnectionToken = "";

App.FileValidation = function() {
	var file = $('#upload-form :file')[0].files[0];
    name = file.name;
    size = file.size;
    type = file.type;
    if(!(/mp3/).test(type)) {
    	alert("only mp3 is supported");
    	return false;
    }
    if(size > 20000000) {
    	alert("the file size limit is 20mb");
    	return false;
    }
    return true;
}

App.TriggerJsView = Ember.View.extend({
  didInsertElement: function(evt) {
    $(':file').filestyle({buttonText: "Choose file"});
    $(':file').change(function(){
	    App.FileValidation();
	});
  }
});

App.Ajax = function(path, data, type) {
	return new RSVP.Promise(function(resolve, reject) {
		var jqxhr = $.ajax( {
			  'type': type,
			  'url': path,
			  'data': data,
			  'dataType': 'json'
			})
		    .done(function(jsCt) {
		    	if('success' in jsCt) {
					if(jsCt['success'] == 'true') {
						resolve(jsCt);
					} else {
						if('expire-token' in jsCt && jsCt['expire-token'] == 'true') {
							App.ConnectionToken = "";
							CookieSetToken("");
						}
						reject(('error' in jsCt)? jsCt['error'] :"Bad response from api/message/delete webservice");	
					}
				} else {
					reject('Bad response from api/message/delete webservice');
				}
		    })
		    .fail(function(self) {
		    	reject("Can't connect to " + path + " webservice");
		    });
		});
	};

App.DeleteMessage = function(messageId) {
	return App.Ajax('api/message/delete', {'token': App.ConnectionToken, 'message-id': messageId}, 'POST');
}

App.GetSaltKey = function() {
	return App.Ajax('api/saltkey', {}, 'GET').then(function(jsCt) {
		if('saltKey' in jsCt) {
			return jsCt['saltKey'];
		} else {
			return RSVP.reject('saltkey webservice: saltKey is not in response');
		}
	});
}

App.GetToken = function(login, password, saltKey) {
	var hashPass = EncryptedPassword(password, saltKey);
	return App.Ajax('api/login', {'login': login, 'hash-pass': hashPass, 'salt-key': saltKey}, 'POST').then(function(jsCt) {
		if('token' in jsCt) {
			return jsCt['token'];
		} else {
			return RSVP.reject('login webservice: token is not in response');
		}
	});
}

App.UploadMessage = function() {
	return new RSVP.Promise(function(resolve, reject) {
		$('#form-hidden-token')[0].value = App.ConnectionToken;
		if(!App.FileValidation()) {
			reject("File selected is not supported or is too big");
		}
		var formData = new FormData($('#upload-form')[0]);
	    $.ajax({
	        url: 'api/message/send',  //server script to process data
	        type: 'POST',
	        xhr: function() {  // custom xhr
	            var myXhr = $.ajaxSettings.xhr();
	            if(myXhr.upload){ // check if upload property exists
	                myXhr.upload.addEventListener('progress',ProgressHandlingFunction, false); // for handling the progress of the upload
	            }
	            return myXhr;
	        },
	        //Ajax events
	        //beforeSend: beforeSendHandler,
	        success: function(jsCt) {
	        	if('success' in jsCt) {
					if(jsCt['success'] == 'true') {
						resolve(jsCt['message']);
					} else {
						if('expire-token' in jsCt && jsCt['expire-token'] == 'true') {
							App.ConnectionToken = "";
							CookieSetToken("");
						}
						reject(('error' in jsCt)? jsCt['error'] : "Bad response from api/message/send webservice");
					}
				} else {
					reject('Bad response from api/message/send webservice');
				}
	        },
	        error: function() {
	        	reject("Error uploading the file");
	        },
	        // Form data
	        data: formData,
	        //Options to tell JQuery not to process data or worry about content-type
	        cache: false,
	        contentType: false,
	        processData: false
	    });
	});
}

App.CheckToken = function(controller) {
	if(App.ConnectionToken = "") {
		controller.set('errorMessage', '');
		controller.transitionToRoute('index');
	}
}

App.ListController = Ember.ObjectController.extend({
	selectedMessage: {},
	errorMessage: "",
	isUploading: false,

	hasError: function() {
    	return this.get('errorMessage').length > 0;
  	}.property('errorMessage'),

	deleteIntention: function(item) {
		this.set('selectedMessage', item);
		$('#deleteModal').modal();
	},

	delete: function(item) {
		var self = this;
		App.DeleteMessage(item.id).then(function(success) {
			self.get('model').removeObject(item);
			$('#deleteModal').modal('hide');
			self.set('errorMessage', '');
		}, function(err) {
			$('#deleteModal').modal('hide');
			if(err && err != "") {
				self.set('errorMessage', err);	
			} else {
				self.set('errorMessage', 'unexpecter error');
			}
			App.CheckToken(self);
		});
	},

	uploadFile: function() {
		var self = this;
		this.set('isUploading', true);
		App.UploadMessage().then(function(mess) {
			self.set('errorMessage', '');
			self.set('isUploading', false);
			console.dir(mess);
			self.get('model').pushObject(mess);
		}, function(err) {
			console.log("error message: " + err);
			self.set('errorMessage', err);
			self.set('isUploading', false);
			App.CheckToken(self);
		});
	}
});

App.IndexController = Ember.ObjectController.extend({
  isLoading: false,
  errorMessage : "",
  hasError: false,
  login: "",
  password: "",

  hasError: function() {
	return this.get('errorMessage').length > 0;
  }.property('errorMessage'),

  loginAction: function() {
  	if(this.get('login').trim().length == 0) {
  		this.set('errorMessage', 'login field is empty');
  	} else if(this.get('password').trim().length == 0) {
  		this.set('errorMessage', 'password field is empty');
  	} else {
  		this.set('isLoading', true);
  		// Assign handlers immediately after making the request,
		// and remember the jqxhr object for this request
		var self = this;

		App.GetSaltKey().then(function(saltKey) {
			return App.GetToken(self.get('login'), self.get('password'), saltKey);
		}).then(function(token) {
			App.ConnectionToken = token;
			CookieSetToken(token);
			self.set('errorMessage', '');
			self.transitionToRoute('list');
		}, function(err) {
  			self.set('errorMessage', err);
		});
	}
  }
});
