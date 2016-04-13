angular.module('younow.modals.gate', [])

.controller('GateModalCtrl', ["$scope", "$translate", "$modalInstance", "data", function($scope, $translate, $modalInstance, data) {
	$scope.data = data;
	$scope.respond = function(reponse) {
		$modalInstance.close(reponse);
	};
}])

;
