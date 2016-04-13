angular.module('younow.modals.iframe', [])

.controller('IframeModalCtrl', ["$scope", "Api", "src", function($scope, Api, src) {
	$scope.src = Api.trustedSrc(src);
}])

;
