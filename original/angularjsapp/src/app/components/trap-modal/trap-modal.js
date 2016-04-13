angular.module('younow.modals.trap', [])

.controller('TrapModalCtrl', ["$scope", "$modal", "$modalInstance", "config", "session", "data", "source", function($scope, $modal, $modalInstance, config, session, data, source) {

	$scope.user = data.user;
	$scope.source = source;

	$scope.nothumb = config.settings.ServerCDNBaseUrl + '/images/nothumb.jpg';

	$scope.thumbPath = config.settings.ServerCDNBaseUrl + '/php/api/channel/getImage/channelId=';
	$scope.background = function(id, type, refresher) {
		type = type || 'Image';
		return 'background:url(' + config.settings.ServerCDNBaseUrl + '/php/api/channel/get' + type + '/channelId=' + id + ') no-repeat center center; background-size: cover;';
	};

	if (data.type === 'fan') {
		$scope.fanTrap = true;
		$scope.heading = 'To participate, become a fan of ' + ($scope.user.profile || $scope.user.profileUrlString);
		$scope.subheading = 'You will get updates when people comment or like your posts';
	}

	if (data.type === 'archives') {
		$scope.loginTrap = true;
		$scope.heading = 'To watch my archived broadcasts, you have to login to YouNow!';
	}

	$scope.showLoginModal = function() {
		$modalInstance.close();
	};

	// If the status changed to 'fan' in the background, close the modal
	if ($scope.fanTrap) {
		$scope.$watch(function() {
			return session.fanStatus[data.user.userId];
		}, function(status) {
			if (status) {
				$scope.$evalAsync(function() {
					if (typeof data.callback == 'function') {
						data.callback();
					}
					$modalInstance.close();
				});
			}
		}, true);
	}


}])

;
