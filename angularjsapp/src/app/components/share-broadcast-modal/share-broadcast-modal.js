angular.module('younow.modals.share-broadcast-modal', [])

.controller('ShareBroadcastModalCtrl', ["$scope", "$modalInstance", "session", "data", function($scope, $modalInstance, session, data) {
	$scope.modal = {};
	$scope.modal.session = session;
	$scope.modal.type = data.type;
	$scope.modal.recommendMessage = data.message;

	$scope.modal.invite = function() {
		if ($scope.modal.form.$valid) {
			$modalInstance.close($scope.modal.recommendMessage);
		}
	};


	$scope.modal.closeModal = function() {
		$modalInstance.close();
	};
}])

;
