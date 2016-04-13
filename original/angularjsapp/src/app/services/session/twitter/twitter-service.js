angular.module('younow.services.session.twitter', [])

.factory('twitter', ["$q", "$window", "config", "Api", function($q, $window, config, Api) {

	var twitter = {};

	twitter.authenticate = function(silent) {
		var url = config.settings.ServerLocalBaseUrl + '/twitterLogin.php';
		var loginWindow = window.open(url, 'Twitter Login', 'location=0, status=0, width=800, height=400, scrollbars=1');
		//save this popup in order to see if the popup has been closed or not.
		window.twitterPopup = loginWindow;

		// Setup a promise for the auth
		twitter.deferred = $q.defer();
		return twitter.deferred.promise;
	};

	$window.twitterSuccessCallback = function(userInfo) {

		var relevant = {};
		var nameTokens = userInfo.name ? userInfo.name.split(' ') : [];

		relevant.twitterId = userInfo.id_str;
		relevant.firstName = nameTokens[0] || '';
		relevant.lastName = nameTokens[1] || '';
		relevant.nickname = userInfo.screen_name || '';
		relevant.thumb = userInfo.profile_image_url || '';
		relevant.description = userInfo.description || '';
		relevant.url = userInfo.screen_name ? 'http://www.twitter.com/' + userInfo.screen_name : '';
		relevant.connections = userInfo.followers_count;
		relevant.oauthToken = userInfo.oauth_token;
		relevant.oauthTokenSecret = userInfo.oauth_token_secret;
		relevant.location = userInfo.location;

		// Send to YouNow
		// twitter.deferred.resolve(relevant);
		Api.returnDeferred(twitter.deferred, 'resolve', relevant);
	};

	return twitter;

}])

;
