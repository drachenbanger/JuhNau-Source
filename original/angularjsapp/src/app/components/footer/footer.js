angular.module('younow.footer', [
	'ui.router'
])

.directive('footer', function() {
	return {
		restrict: 'A', // Directive which is declared as an attribute
		replace: true, // Replace the element where the directive is declared
		templateUrl: 'angularjsapp/src/app/components/footer/footer.tpl.html',
		controller: 'FooterCtrl'
	};
})

.controller('FooterCtrl', function HomeController($scope, $rootScope, $http, $window, $state, $modal, config, $translate, session, Api, broadcasterService, swf, guestService, $filter) {

	$scope.state = $state;
	$scope.config = config;
	$scope.links = {};

	$scope.selectLanguage = function(la) {
		//$rootScope.gaEvent = function(category, action, label, value, extraFields) {
		$rootScope.gaEvent('LANGUAGE', 'user-selected', 'from-footer', la);
		session.updateLanguage(la);
		guestService.guestListCountFormatted = Api.trustedHTML($filter('translate')('_guests'));
	};

	$scope.selectLocale = function(la) {
		$rootScope.gaEvent('LOCALE', 'user-selected', 'from-footer', la);
		broadcasterService.updateLocale(la);
	};

	$scope.openModal = function(src) {
		if ($state.is('about') && $window.navigator.userAgent.search('Chrome/39') > 0) {
			$window.open(src, '_blank');
			return false;
		}
		$modal.iframe(src);
	};

	$scope.openAsModal = function(e) {
		if ($state.is('about') && $window.navigator.userAgent.search('Chrome/39') > 0) {
			return true;
		}
		$modal.iframe(e.target.href);
		e.preventDefault();
	};

	$scope.openDoc = function(e, label) {
		$scope.doAboutClick('Footer link', label);
		if (!$state.is('policy')) {
			$window.open(e.target.href, '_blank');
			e.preventDefault();
		}
	};

	$scope.showAbout = function() {
		$state.go('about');
	};

	$scope.downloadApp = function(platform) {
		Api.goMobile(platform, session.user.level, '_FOOTER');
	};

	$scope.doAboutClick = function(action, label) {
		if ($state.is('about')) {
			$rootScope.gaEvent('About Page Button Click', action, label);
		}
	};

})

;
