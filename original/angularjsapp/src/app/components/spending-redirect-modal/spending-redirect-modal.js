angular.module('younow.modals.spending-redirect', [])

.controller('SpendingRedirectModalCtrl', function($scope, $modalInstance, $modal, session, config, params) {
	$scope.settings = config.settings;
	$scope.params = params;

	$scope.dismiss = function() {
		$modalInstance.dismiss();
	};

	$scope.tryAgain = function() {
		$modalInstance.close();
		$modal.buyBars(session.user.spendingDisabled);
	};

	$scope.downloadTheApp = function() {
		$modalInstance.close();
		$modal.mobileDownload();
	};

	$scope.contactSupport = function() {
		var supportWindow = window.open(config.settings.SupportUrl, '_blank');
		supportWindow.focus();
	};

})

;
