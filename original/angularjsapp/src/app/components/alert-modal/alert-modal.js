angular.module('younow.modals.alert', [])
.controller('AlertModalCtrl', ["$scope", "message", "Api", "$translate", function($scope, message, Api, $translate) {
	try {
		$translate(message).then(function(translated) {
			$scope.message = Api.trustedHTML(Api.linkify(translated));
		});
	} catch(e) {
		$scope.message = Api.trustedHTML(Api.linkify(message));
	}
}])

;
