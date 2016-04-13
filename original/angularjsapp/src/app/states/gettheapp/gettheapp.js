angular.module('younow.gettheapp', ['ui.router'])

.config(["$stateProvider", function config($stateProvider) {
	$stateProvider
		.state('/app', {
			url: '/app/:type',
			templateUrl: 'angularjsapp/src/app/states/gettheapp/gettheapp.tpl.html',
			controller: 'gettheappCtrl'
		});
}])

.controller('gettheappCtrl', ["$scope", "session", "$timeout", "Api", "$state", "$modal", "config", "$stateParams", "trackingPixel", function DocsController($scope, session, $timeout, Api, $state, $modal, config, $stateParams, trackingPixel) {
	var vm = {};
	vm.baseCDN = config.settings.ServerCDNBaseUrl;
	vm.telInputId = 'telInputModal';
	//vm.device = $state.current.url.toLowerCase().indexOf('iphone') !== -1 ? 'iphone' : 'android';
	vm.device = $stateParams.type == 'android' ? 'android' : 'iphone';

	vm.getTheApp = function() {
		trackingPixel.trackClick('GETTHEAPP', {
			field1: 'HOME'
		});
		$modal.mobileDownload('HOME');
	};
	//if it's a prerender bot then let's direct him to the app
	if (window.isPrerender) {
		//renderPage();
	}

	$scope.vm = vm;
}])

;
