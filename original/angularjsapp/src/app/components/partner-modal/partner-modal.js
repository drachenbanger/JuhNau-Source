angular.module('younow.modals.partner', [])

.controller('PartnerModalCtrl', ["$scope", "$timeout", "$modalInstance", "session", "Api", "config", function($scope, $timeout, $modalInstance, session, Api, config) {

	$scope.continue = function() {
		window.open('/partners', '_blank');
		$modalInstance.close();
	};

}])

;
