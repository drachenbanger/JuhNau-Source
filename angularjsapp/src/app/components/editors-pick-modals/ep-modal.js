angular.module('younow.modals.ep', [])

.controller('EpModalCtrl', ["$scope", "config", "session", "$modalInstance", "Api", "data", function($scope, config, session, $modalInstance, Api, data) {
	//namespace
	$scope.modal = {
		state: data.state ? data.state : 'intro'
	};

	var states = {
		'intro': 2,
		'description': 2,
		'expired': 4
	};

	$scope.modal.thumb = config.settings.ServerCDNBaseUrl + '/php/api/channel/getImage/channelId=' + session.user.userId;
	$scope.modal.noThumb = config.settings.ServerCDNBaseUrl + '/images/nothumb.jpg';
	$scope.modal.session = session;
	$scope.modal.name = Api.friendlyName(session.user);
	$scope.modal.continue = function() {
		if ($scope.modal.state === 'intro') {
			$scope.modal.state = 'description';
		} else {
			$modalInstance.close();
		}
	};

	$scope.$on('$destroy', function() {
		Api.post('channel/updateEditorsPick', {
			userId: session.user.userId,
			channelId: session.user.userId,
			locale: config.UILocale,
			state: states[$scope.modal.state]
		});
	});

}])

;
