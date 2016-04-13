angular.module('younow.main', [
	'ui.router',
	'younow.header',
	'younow.footer',
	'younow.leftsidebar',
	'younow.activity-panel',
	'younow.explore',
	'younow.settings',
	'younow.channel' // This must be injected last, so it doesn't override /explore and /settings
])

.config(["$stateProvider", function config($stateProvider) {
	$stateProvider.state('main', {
		url: '',
		abstract: true,
		templateUrl: 'angularjsapp/src/app/states/main/main.tpl.html',
		controller: 'MainCtrl'
	});
}])

.controller('MainCtrl', function HomeController($scope, $rootScope, $modal, config, session, Api, broadcasterService, trackingPixel, $timeout, session, eventbus, $interval, $filter) {

	$scope.session = session;
	$scope.broadcasterService = broadcasterService;

	// not a phone, continue
	// is phone, stop
	if (!/Android/i.test(navigator.userAgent) &&
		!/BlackBerry/i.test(navigator.userAgent) &&
		!/iPhone|iPad|iPod/i.test(navigator.userAgent) &&
		!/IEMobile/i.test(navigator.userAgent)
	) {} else {
		window.location.href = '/';
	}

	$scope.session = session;
	$scope.closeNotification = function(group) {
		Api.closeTopNotification(group);
	};

	$scope.closeBanner = function(group) {
		Api.closeTopBanner(group);
	};

	$scope.onboardingCTA = function() {
		trackingPixel.trackClick('BANNER');
		$rootScope.gaEvent('Conversion', 'Click Welcome Banner CTA', trackingPixel.getUserLocation() || 'ANCILLARY');
		Api.closeTopBanner("sticky");
	};

	if ($rootScope.skipAgeGate) {
		$rootScope.skipAgeGate = false;
		$modal.ageGate();
	}


	// AUTOFAN
	var autofan = {};

	// setup fan
	autofan.fan = function() {
		if (!broadcasterService.broadcaster || broadcasterService.broadcaster.userId == session.loginData.id) {
			return false;
		}
		var post = {
			userId: session.loginData.id,
			channelId: broadcasterService.broadcaster.userId,
			broadcastId: broadcasterService.broadcaster.broadcastId
		};
		Api.post('channel/fan', post).then(function(response) {
			if (response.data && !response.data.errorCode) {
				// Button
				session.fanStatus[broadcasterService.broadcaster.userId] = true;
				// Fan count
				broadcasterService.broadcaster.totalFans = broadcasterService.broadcaster.totalFans + 1;
				// Notification
				Api.showTopNotification($filter('translate')('autofan_congrats', {
					value: ((broadcasterService.broadcaster.profile || broadcasterService.channel.profile))
				}), 'success', false, false, 5000);
			}
		});
	};

	// autofan prompt
	autofan.oldBroadcastId = 0;
	autofan.watchedTime = 0;
	autofan.show = function() {
		// if not logged in, prompt
		if (!session.user.userId) {
			// track
			trackingPixel.capture({
				'event': 'REGISTER_PROMPT'
			});
			// modal
			$modal.loginModal(true, 'AUTO_REGISTER', {
				title: 'Sign up to continue watching'
			}).result.then(function(response) {
				// track
				trackingPixel.capture({
					'event': 'REGISTER_PROMPT'
				});
			}).catch(function() {
				// track
				trackingPixel.capture({
					'event': 'AUTO_REGISTER',
					'extradata': 'LOGIN_REJECTED'
				});
			});
		}
		// cleanup
		$interval.cancel(autofan.watch);
	};
	autofan.check = function() {
		if (session.user && !session.user.userId && broadcasterService.broadcaster && broadcasterService.broadcaster.broadcastId) {
			if (broadcasterService.broadcaster.broadcastId != autofan.oldBroadcastId) {
				autofan.watchedTime = 0; // new broadcast
			} else {
				autofan.watchedTime = autofan.watchedTime + 1000; // playing
				if (autofan.watchedTime == 120000) { // only once
					autofan.show();
				}
			}
			autofan.oldBroadcastId = broadcasterService.broadcaster.broadcastId;
		}
	};
	// autofan fan
	if (!session.autofanned && session.loginData && session.loginData.newUser) {
		session.autofanned = true;
		autofan.fan();
	}
	autofan.watch = $interval(autofan.check, 1000);
	$scope.$on('$destroy', function() {
		$interval.cancel(autofan.watch);
	});


})

;
