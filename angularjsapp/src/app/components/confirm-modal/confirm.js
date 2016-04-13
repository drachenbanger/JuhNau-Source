angular.module('younow.modals.confirm', [])

.directive('confirm', ["$modal", function($modal) {
	return {
		restrict: 'A',
		scope: {
			confirm: '=',
			confirmData: '='
		},
		link: function(scope, element, attrs) {
			element.bind('click', function() {

				var ConfirmCtrl = ["$scope", "message", "Api", "$translate", function($scope, message, Api, $translate) {
					try {
						$translate(message).then(function(translated) {
							$scope.message = translated;
						});
					} catch(e) {
						$scope.message = message;
					}
				}];

				var modalInstance = $modal.open({
					templateUrl: 'angularjsapp/src/app/components/confirm-modal/confirm.tpl.html',
					controller: ConfirmCtrl,
					windowClass: 'confirmation-modal',
					resolve: {
						message: function() {
							return attrs.confirmMessage || "Are you sure?";
						}
					}
				});

				modalInstance.result.then(function() {
					scope.confirm(scope.confirmData);
				}, function() {
					//Modal dismissed
				});

			});

		}
	};
}])

;
