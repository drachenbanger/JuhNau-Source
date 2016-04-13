angular.module('younow.jobs', ['ui.router', 'younow.services.utils'])

.config(["$stateProvider", "$urlRouterProvider", "ApiProvider", function config($stateProvider, $urlRouterProvider, ApiProvider) {
	ApiProvider.reRouteHandler('/jobs', 'jobs');

	$stateProvider.state('infojobs', {
			url: '/info/:locale/careers',
			templateUrl: 'angularjsapp/src/app/states/jobs/jobs.tpl.html',
			controller: 'jobsCtrl'
		})
		.state('jobs', {
			url: '/careers',
			templateUrl: 'angularjsapp/src/app/states/jobs/jobs.tpl.html',
			controller: 'jobsCtrl'
		});
}])

.controller('jobsCtrl', function DocsController($scope, $timeout, Api, $state, config) {
	// set Temporary language from Url
	if (window.globalVars.pageLanguage) {
		config.setTempLanguage(window.globalVars.pageLanguage);
		window.globalVars.pageLanguage = null;
	}
	
	$scope.$state = $state;

	var injected = false;
	var inject = Api.inject('https://boards.greenhouse.io/embed/job_board/js?for=younow', 'greenhouse-jobboard').then(function() {
		injected = true;
		if (window.Grnhse) {
			window.Grnhse.Iframe.load();
		}
	}).catch(function() {});
	$timeout(function() {
		// failsafe: if hit back button, the Api.inject isn't fired for some reason
		if (!injected) {
			window.Grnhse.Iframe.load();
			injected = true;
		} else {
			injected = false;
		}
	}, 1000);

})

;
