angular.module('younow.missing', [])

.config(["$stateProvider", function config($stateProvider) {

	$stateProvider.state('main.missing', {
		url: '',
		templateUrl: 'angularjsapp/src/app/states/main/missing/missing.tpl.html',
		controller: 'MissingCtrl'
	});

}])

.controller('MissingCtrl', ["$scope", "$location", function HomeController($scope, $location) {

	$scope.username = $location.path().split('/')[1];


}])

;
