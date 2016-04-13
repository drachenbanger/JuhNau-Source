angular.module('younow.about', [
	'ui.router'
])

.config(["$stateProvider", function config($stateProvider) {

	$stateProvider.state('about', {
		url: '/about',
		templateUrl: 'angularjsapp/src/app/states/about/about.tpl.html',
		controller: 'AboutCtrl'
	});


}])

.controller('AboutCtrl', ["$scope", "$rootScope", "$window", "$timeout", "$modal", "config", "broadcasterService", "Api", "$state", "session", "trackingPixel", function HomeController($scope, $rootScope, $window, $timeout, $modal, config, broadcasterService, Api, $state, session, trackingPixel) {
	broadcasterService.channelSwitch = "ABOUT";
	$rootScope.skipAgeGate = true;
	$scope.base = config.settings.ServerCDNBaseUrl;
	$scope.visible = true;
	$scope.closed = (config.settings.loginGate === 'none' || session.loggedIn) ? false : true;
	$scope.open = (config.settings.loginGate === 'hard' && !session.loggedIn) ? false : true;
	if ($scope.closed) {
		$rootScope.gaEvent('Home Page', 'Page load', 'about');
	}
	// Wait while CSS loads. TODO: Integrate landing page CSS to avoid this
	$timeout(function() {
		$scope.loaded = true;
	}, 300);
	Api.store('hideYounowLanding', true);

	$rootScope.$watch(function() {
		return session.loggedIn;
	}, function(locale) {
		if (!$scope.justLoggedIn) {
			$scope.closed = (config.settings.loginGate === 'none' || session.loggedIn) ? false : true;
			$scope.open = (config.settings.loginGate === 'hard' && !session.loggedIn) ? false : true;
		}
	});

	// Hack to force the video to loop
	$timeout(function() {
		var myVideo = document.getElementById('video');
		if (myVideo) {
			if (typeof myVideo.loop == 'boolean') { // loop supported
				myVideo.loop = true;
			} else { // loop property not supported
				myVideo.addEventListener("timeupdate", function() {
					if (myVideo.currentTime > 16.500) {
						myVideo.load();
					}
				}, true);
			}
		}
	});

	$scope.trustedSrc = function(src) {
		return Api.trustedSrc(src);
	};

	$scope.login = function(type, position) {
		if (session.authenticate[type]) {
			if (!$scope.attemptedLogin) {
				$scope.attemptedLogin = true;
				$rootScope.gaEvent('Home Page', 'Attempted Login');
			}
			$rootScope.gaEvent('Home Page', 'Clicks ' + type, position);
			session.auth(type).then(function(response) {
				if (response && response.data && response.data.id) {
					$scope.justLoggedIn = true;
					var loginType = response.data.newUser ? 'New' : 'Returning';
					$rootScope.gaEvent('Home Page', 'Logged In (' + loginType + ')');
					broadcasterService.featuredBroadcaster();
				} else {
					// Failed
				}
			});
		}
	};

	$scope.action = function(action) {
		// Only tracking events when they are gated
		if ($scope.closed) {
			$rootScope.gaEvent('Home Page', action);
		}
	};

	$scope.showPromo = function() {
		if ($state.is('about') && $window.navigator.userAgent.search('Chrome/39') > 0) {
			$window.open('https://www.youtube.com/watch?v=BiXDFkraMtY', '_blank');
			return false;
		}
		$modal.iframe('http://www.youtube.com/embed/BiXDFkraMtY?autoplay=1', 'iframe-modal-dark');
	};

	$scope.watchLiveNow = function(event, label) {
		$scope.aboutClick('To site', label);
		event.preventDefault();
		$timeout(function() {
			if ($scope.open) {
				broadcasterService.featuredBroadcaster();
			}
		}, 0);
	};

	$scope.trackMobile = function(platform) {
		Api.goMobile(platform, session.user.level, '_LANDING');
	};

	$scope.aboutClick = function(action, label) {
		if (action.toUpperCase().indexOf('APP')) {
			trackingPixel.trackClick('GETTHEAPP', {
				field1: 'ABOUT'
			});
		}
		$rootScope.gaEvent('About Page Button Click', action, label);
	};

}])

;
