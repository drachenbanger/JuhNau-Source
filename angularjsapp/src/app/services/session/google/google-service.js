angular.module('younow.services.session.google', [])

.factory('google', ["$q", "$timeout", "Api", "config", function($q, $timeout, Api, config) {

	var google = {};

	window.googleReady = $q.defer();
	google.ready = function() {
		return window.googleReady.promise;
	};

	// Setup immediately, or after API has loaded
	if (window.gapi) {
		window.googleReady.resolve();
	} else {
		window.googleAsyncInit = function() {
			window.googleReady.resolve();
		};
	}

	google.authenticate = function(silent) {
		google.ready().then(function() {
			window.gapi.auth.signIn({
				clientid: config.settings.GOOGLE_PLUS_CLIENT_ID,
				immediate: true,
				cookiepolicy: 'single_host_origin',
				scope: 'https://www.googleapis.com/auth/plus.login https://www.googleapis.com/auth/plus.profile.emails.read',
				callback: 'googleLogin'
			});
		});
		// Setup a promise for the auth
		google.deferred = $q.defer();
		return google.deferred.promise;
	};

	window.googleLogin = function(authResponse) {
		if (authResponse.status.signed_in) {
			google.expandUser(authResponse);
		}
	};

	google.expandUser = function(authResponse) {
		// Load the gplus API
		window.gapi.client.load('plus', 'v1', function() {

			// Fetch user details
			window.gapi.client.plus.people.get({
				userId: 'me'
			}).execute(function(resp) {
				var userInfo = angular.extend(authResponse, resp);

				// Pull main email out
				angular.forEach(resp.emails, function(email) {
					if (!userInfo.email && email.type === 'account') {
						userInfo.email = email.value;
					}
				});

				// Fetch user connections
				window.gapi.client.plus.people.list({
					userId: 'me',
					collection: 'visible'
				}).execute(function(resp) {
					userInfo.totalItems = Number(resp.totalItems) || 0;

					// Filter to relevant info
					google.relevantFields(userInfo);

				});
			});
		});
	};

	google.relevantFields = function(userInfo) {

		var relevant = {};

		relevant.email = userInfo.email;
		relevant.gender = userInfo.gender;
		relevant.url = userInfo.url;
		relevant.googleId = userInfo.id;
		relevant.accessToken = userInfo.access_token;
		relevant.code = userInfo.code;
		relevant.firstName = userInfo.name.givenName;
		relevant.lastName = userInfo.name.familyName;
		relevant.nickname = userInfo.displayName || '';
		relevant.thumb = (userInfo.image ? userInfo.image.url : '').replace('sz=50', 'sz=100');
		relevant.description = userInfo.aboutMe || '';
		relevant.connections = userInfo.totalItems || 0;

		// Send to YouNow
		Api.returnDeferred(google.deferred, 'resolve', relevant);

	};

	/*

	google.authenticate = function(silent) {
	  var url = config.settings.ServerHomeBaseUrl+'googleLogin.php';
	  var loginWindow = window.open(url, 'Twitter Login', 'location=0, status=0, width=800, height=400, scrollbars=1');

	  // Setup a promise for the auth
	  google.deferred = $q.defer();
	  return google.deferred.promise;
	};

	window.googleSuccessCallback = function(userInfo) {

	  var relevant = {};

	  relevant.email =        userInfo.email;
	  relevant.gender =       userInfo.gender;
	  relevant.url =          userInfo.url;
	  relevant.googleId =     userInfo.id;
	  relevant.accessToken =  userInfo.access_token;
	  relevant.code =         userInfo.code;
	  relevant.firstName =    userInfo.name.givenName;
	  relevant.lastName =     userInfo.name.familyName;
	  relevant.nickname =     userInfo.displayName || '';
	  relevant.thumb =        (userInfo.image ? userInfo.image.url : '').replace('sz=50', 'sz=100');
	  relevant.description =  userInfo.aboutMe || '';
	  relevant.connections =  userInfo.totalItems || 0;

	  // Send to YouNow
	  Api.returnDeferred(google.deferred, 'resolve', relevant);


	};
	*/

	return google;

}])

;
