angular.module('younow.modals.youtube-subscribe', [])

.controller('YoutubeSubscribeCtrl', ["$scope", "$window", "$timeout", "username", "config", function($scope, $window, $timeout, username, config) {

	$scope.base = config.settings.ServerCDNBaseUrl;
	var pieces = username.split('/');
	if (pieces[0] === 'user') {
		$scope.channel = pieces[1];
	} else
	if (pieces[0] === 'channel') {
		$scope.channelid = pieces[1];
	} else {
		$scope.channel = username;
	}
	// Render Youtube button (must be delayed until rest of template is rendered)
	$timeout(function() {
		gapi.ytsubscribe.go();
	}, 10);
	$timeout(function() {
		gapi.ytsubscribe.go();
	}, 300); // backup

}])

;
