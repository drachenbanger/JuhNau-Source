angular.module('younow.services.session.instagram', [])

.factory('instagram', ["$q", "$window", "config", "Api", function($q, $window, config, Api) {

	var instagram = {};

	instagram.authenticate = function(silent) {
		var url = config.settings.ServerLocalBaseUrl + '/instagramAuth.php';
		var loginWindow = window.open(url, 'Instagram Login', 'location=0, status=0, width=650, height=350, scrollbars=1');
		//save this popup in order to see if the popup has been closed or not.
		window.instagramPopup = loginWindow;

		// Setup a promise for the auth
		instagram.deferred = $q.defer();
		return instagram.deferred.promise;
	};

	$window.instagramCallback = function(userInfo) {

		window.instagramPopup.close();

		if (!userInfo || !userInfo.id || !userInfo.access_token) {
			Api.returnDeferred(instagram.deferred, 'reject', userInfo);
		}

		var relevant = {};
		var nameTokens = userInfo.full_name ? userInfo.full_name.split(' ') : [];

		relevant.instagramId = userInfo.id;
		relevant.firstName = nameTokens[0] || '';
		relevant.lastName = nameTokens[1] || '';
		relevant.nickname = userInfo.username || '';
		relevant.thumb = userInfo.profile_picture || '';
		relevant.description = userInfo.bio || '';
		relevant.url = userInfo.username ? 'https://instagram.com/' + userInfo.username : '';
		relevant.connections = userInfo.followed_by;
		relevant.oauthToken = userInfo.access_token;

		// Send to YouNow
		// instagram.deferred.resolve(relevant);
		Api.returnDeferred(instagram.deferred, 'resolve', relevant);
	};

	return instagram;

}])

;