angular.module('younow.modals.partner-agreement', [])

.controller('PartnerAgreementModalCtrl', ["$scope", "$modalInstance", "session", "$location", "$state", function($scope, $modalInstance, session, $location, $state) {
	//setup initial message
	$scope.title = "Updated Partner Agreement";
	$scope.message = "Please be sure to review and accept before you proceed.";
	$scope.cancelState = false;

	$scope.checkAgreement = function(hasAgreed) {
		if (hasAgreed === false) {
			$scope.title = "Sure you want to skip?";
			$scope.message = "Skipping will remove your Partner status until you accept the updated terms.";
			$scope.cancelState = true;
		}
		if (hasAgreed === true) {
			$modalInstance.close();
			$state.go('/partners');
		}
		if (hasAgreed === undefined) {
			$scope.cancelState = false;
			$scope.title = "Updated Partner Agreement";
			$scope.message = "Please be sure to review and accept before you proceed.";
		}
	};

	$scope.finalDismiss = function() {
		$modalInstance.close();
	};

}])

;
