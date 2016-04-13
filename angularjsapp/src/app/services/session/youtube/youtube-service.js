angular.module('younow.services.session.youtube', [])

.factory('youtube', ["$q", "$window", "$timeout", "$http", "Api", "config", "google", "$modal", function($q, $window, $timeout, $http, Api, config, google, $modal) {

	var youtube = {};

	youtube.authenticate = function(silent) {
		google.ready().then(function() {
			$window.gapi.auth.signIn({
				clientid: config.settings.GOOGLE_PLUS_CLIENT_ID,
				immediate: true,
				cookiepolicy: 'single_host_origin',
				accesstype: 'offline',
				approvalprompt: 'force',
				includegrantedscopes: 'false',
				scope: 'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.upload',
				callback: 'youtubeLogin'
			});
		});
		// Setup a promise for the auth
		youtube.deferred = $q.defer();
		return youtube.deferred.promise;
	};

	$window.youtubeLogin = function(authResponse) {
		if (authResponse.status.signed_in) {
			youtube.expandUser(authResponse);
		}
	};

	youtube.expandUser = function(authResponse) {
		// Load the youtube API
		window.gapi.client.load('youtube', 'v3', function() {
			// Fetch user details
			window.gapi.client.youtube.channels.list({
				part: 'snippet,statistics',
				mine: true,
				maxResults: 10
			}).execute(function(resp) {
				var userInfo = {};
				// userInfo.accessToken = authResponse.access_token;
				// userInfo.createdAccessToken = authResponse.issued_at;
				userInfo.authCode = authResponse.code;
				userInfo.youtubeChannelId = resp.items[0].id;
				userInfo.youtubeChannelUrl = 'www.youtube.com/channel/' + resp.items[0].id;
				userInfo.youtubeChannelName = resp.items[0].snippet.title;
				userInfo.connections = resp.items[0].statistics.subscriberCount;
				userInfo.viewCount = resp.items[0].statistics.viewCount;
				// Send to YouNow
				Api.returnDeferred(youtube.deferred, 'resolve', userInfo);
			});
		});
	};

	return youtube;

}])

;
