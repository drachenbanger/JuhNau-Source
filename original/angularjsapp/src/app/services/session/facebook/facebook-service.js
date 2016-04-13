angular.module('younow.services.session.facebook', [])

.factory('Facebook', ["$q", "$window", "$timeout", "config", "Api", function($q, $window, $timeout, config, Api) {

	var Facebook = {};

	// Create a promise that resolves when SDK is loaded
	$window.fbready = $q.defer();
	Facebook.ready = function() {
		return $window.fbready.promise;
	};

	// Setup SDK once it loads
	$window.fbAsyncInit = function() {
		if (!Facebook.loaded) {
			Facebook.options = {
				init: {
					appId: config.settings.fbAppId,
					version: "v2.1",
					cookie: true,
					status: true,
					xfbml: true
				},
				scope: "public_profile,email,user_friends"
			};
			$window.FB.init(Facebook.options.init);
			$window.fbready.resolve();
			Facebook.loaded = true;
		}
	};
	// Setup immediately if already loaded
	if ($window.FB) {
		$window.fbAsyncInit();
	}

	// Wrap all FB calls in promises (for easy use, and to wait on SDK loaded)
	Facebook.SDK = function(method, vars) {
		return Facebook.ready().then(function() {
			var deferred = $q.defer();
			if (vars) {
				$window.FB[method](vars, function(response) {
					deferred.resolve(response);
				});
			} else {
				$window.FB[method](function(response) {
					deferred.resolve(response);
				});
			}
			return deferred.promise;
		});
	};

	// Try to Auth the user silently, or show popup if not connected
	Facebook.authenticate = function(silent) {

		// Ensure the SDK has loaded
		return Facebook.ready().then(function() {
			// Setup a promise for the authentication process
			Facebook.deferred = $q.defer();

			// First, attempt a silent auth
			FB.getLoginStatus(function(response) {

				// User has already connected, proceed
				if (response.status === 'connected') {
					Facebook.expandUser(response.authResponse);
				}

				// If it was a silent login, end
				else if (silent) {
					Api.returnDeferred(Facebook.deferred, 'reject', 'facebook silent auth unsuccessful');
				}

				// Otherwise, show the auth dialog (unless silent is forced)
				else {
					Facebook.showAuthDialog();
				}

				// Unless it was a silent login

			});

			return Facebook.deferred.promise;
		});
	};

	// Trigger the Facebook Popup
	Facebook.showAuthDialog = function() {
		var scope = Facebook.options.scope;
		if ($window.tempFBscope) {
			scope = $window.tempFBscope;
			$window.tempFBscope = false;
		}
		FB.login(
			function(response) {
				if (response.status === 'connected') {
					Facebook.expandUser(response.authResponse);
				} else {
					Facebook.deferred.reject(response.status);
				}
			}, {
				scope: scope
			}
		);
	};

	// Fetch user details and send to backend
	Facebook.expandUser = function(authResponse, retry) {

		if (authResponse === null) {
			Facebook.deferred.reject('error');

			return;
		}
		// Fetch user details
		FB.api('/me', function(userData) {

			// If no userData, try again, in case it was a random Facebook error
			// This is to avoid empty object, which triggers "TypeError: Cannot read property '$$hashKey' of null"
			if (!userData) {
				if (!retry) {
					$timeout(function() {
						Facebook.expandUser(authResponse, true);
					}, 300);
				} else {
					Facebook.deferred.reject(authResponse);
				}
			}

			var fb = angular.extend(authResponse, userData);

			var loginData = {
				facebookToken: fb.accessToken,
				facebookWebsite: fb.link,
				facebookEmail: fb.email,
				facebookId: fb.id,
				facebookBirthday: fb.birthday,
				facebookVerified: fb.verified,
				facebookFirstName: fb.first_name,
				facebookLastName: fb.last_name,
				facebookName: fb.name,
				facebookThumbUrl: 'http://graph.facebook.com/' + fb.id + '/picture?type=large'
			};

			// Fetch user connections
			FB.api('/me/friends/?limit=0', function(friends) {

				if (friends && friends.summary && friends.summary.total_count) {
					loginData.connections = friends.summary.total_count;
				}

				// Send to YouNow
				Api.returnDeferred(Facebook.deferred, 'resolve', loginData);

			});

			return fb;

		});

	};

	Facebook.getPagesList = function() {
		var deferred = $q.defer();

		FB.login(function(authResponse) {
			FB.api('/me/accounts', function(response) {
				deferred.resolve(angular.extend(response, authResponse));
			});
		}, {
			scope: 'publish_pages,manage_pages',
			auth_type: 'rerequest'
		});

		return deferred.promise;
	};

	return Facebook;

}])

;
