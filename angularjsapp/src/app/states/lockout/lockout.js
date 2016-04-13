angular.module('younow.lockout', ['ui.router'])

.config(["$stateProvider", function config($stateProvider) {

	$stateProvider.state('lockout', {
		url: '/lockout/',
		templateUrl: 'angularjsapp/src/app/states/lockout/lockout.tpl.html',
		controller: 'LockoutCtrl'
	});


}])

.controller('LockoutCtrl', ["$scope", "$rootScope", "Api", "$state", function DocsController($scope, $rootScope, Api, $state) {

	var lockout = Api.store('younowAgeLockout');
	if (Number(lockout) < (new Date().getTime() / 1000)) {
		$state.go('home');
	} else {
		$rootScope.skipAgeGate = true;
	}

}])

;
