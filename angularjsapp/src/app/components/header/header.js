angular.module('younow.header', [
	'ui.router'
])

.directive('header', function() {
	return {
		restrict: 'A', // Directive which is declared as an attribute
		replace: true, // Replace the element where the directive is declared
		templateUrl: 'angularjsapp/src/app/components/header/header.tpl.html',
		controller: 'HeaderCtrl'
	};
})

.controller('HeaderCtrl', ["$location", "$scope", "$state", "$timeout", "config", "session", "swf", "broadcasterService", "Api", "$translate", "$modal", "$rootScope", "eventbus", "trackingPixel", "guestService", "selfies", "pusher", function HomeController($location, $scope, $state, $timeout, config, session, swf, broadcasterService, Api, $translate, $modal, $rootScope, eventbus, trackingPixel, guestService, selfies, pusher) {
	$scope.session = session;
	$scope.config = config;
	$scope.swf = swf;
	$scope.pusher = pusher;
	$scope.broadcasterService = broadcasterService;
	$scope.searchBox = '';
	$scope.userMenuOpened = false;
	$scope.Api = Api;
	$scope.locales = [];

	for (var locale in config.settings.Locales) {
		$scope.locales.push({
			locale: locale,
			name: config.settings.Locales[locale].name
		});
	}

	var privateScope = {};

	$scope.getBars = function() {
		if (session.user && session.user.banId !== 0) {
			session.checkBan();
			return false;
		}
		$modal.buyBars(session.user.spendingDisabled);
	};

	$scope.goto = function(path) {
		if (!path) {
			return false;
		}
		// Remove hardcoded host
		if (path.substr(0, 4) == 'http') {
			path = path.slice(path.indexOf(path.split('/')[3]));
		}
		$location.path(path);
	};

	$scope.selfProfile = function() {
		if (session.isBroadcasting || swf.settingUpBroadcast || (guestService.guest && guestService.guest.userId == session.user.userId)) {
			session.preventBroadcastInterrupt();
		} else {
			//needs refactor, weird that we are doing this check here 
			if (broadcasterService.broadcaster) {
				broadcasterService.switchAsync(true);
			}
			$state.go('main.channel.detail', {'profileUrlString': session.user.profile});
		}
	};

	$scope.onMainPage = function() {
		if (broadcasterService.broadcaster && broadcasterService.broadcaster.broadcastId && $state.is('main.channel.detail')) {
			return true;
		} else {
			return false;
		}
	};

	$scope.checkNotifications = function(e) {
		var isOpen = angular.element(document.getElementById('notifications-dropdown')).hasClass('open');
		// Only check notifications if dropdown isn't already open
		if (!isOpen) {
			session.notificationCount = 0;
			session.getNotifications(0);
		}
	};

	$scope.openNotification = function(notification) {
		if (notification.linkTo) {
			$scope.goto(notification.linkTo);
		} else {
			broadcasterService.channelSwitch = "NOTIFICATION";
			broadcasterService.switchBroadcaster(notification.eventUserId);
		}
	};

	$scope.openSettings = function(section) {
		if (session.user && session.user.banId !== 0) {
			session.checkBan();
			return false;
		}
		if (swf.settingUpBroadcast || (guestService.guest && guestService.guest.userId == session.user.userId)) {
			session.preventBroadcastInterrupt();
			return false;
		}
		section = section ? '#' + section : '';
		$state.go('main.settings' + section);
	};

	$scope.openWindow = function(url, anchor) {
		if (swf.settingUpBroadcast) {
			session.preventBroadcastInterrupt();
			return false;
		}
		anchor = anchor ? '#' + anchor : '';
		window.open(url + anchor, '_blank');
	};

	$scope.openModForm = function(url, anchor) {
		var params = {},
			fullTime = new Date(),
			minutes = fullTime.getMinutes();

		if (session.user.userId !== 0) {
			params.field1 = session.user.firstName;
			params.field2 = session.user.lastName;
			params.field17 = session.user.email;
		}

		if (broadcasterService.broadcaster && broadcasterService.broadcaster.username) {
			params.field19 = window.location.protocol + '://www.younow.com/' + broadcasterService.broadcaster.profile;
			params.field5 = broadcasterService.broadcaster.username;
		}

		params.field7 = fullTime.getHours() > 12 ? fullTime.getHours() - 12 : fullTime.getHours();
		params['field7-1'] = minutes < 10 ? '0' + minutes : minutes;
		params['Field7-3'] = fullTime.getHours() < 12 ? 'AM' : 'PM';

		url = Api.buildWufooUrl(url + '/', params);
		anchor = anchor ? '#' + anchor : '';
		window.open(url + anchor, '_blank');
	};

	$scope.isPartner = function(type) {
		if (session.user) {
			var partner = session.user.partner;

			if (type === 'active' && partner === 1) {
				return true;
			}
			if (type === 'pending' && (partner === 2 || partner === 6 || partner === 7)) {
				return true;
			}
		}
		return false;
	};

	$scope.needsUpdate = function() {
		var partner = $scope.isPartner('active');

		if ((session.user.mcnTypeId !== "4" && session.user.mcnTypeId !== "3") && partner === true) {
			return true;
		} else {
			return false;
		}
	};

	$scope.loadChannel = function(id) {
		broadcasterService.channelSwitch = "QUEUE";
		broadcasterService.switchBroadcaster(id);
	};

	$scope.dismissUserMenu = function(close) {
		if (privateScope && privateScope.dismissUserMenu) {
			$timeout.cancel(privateScope.dismissUserMenu);
		}
		if (privateScope && close) {
			privateScope.dismissUserMenu = $timeout(function() {
				$scope.userMenuOpened = false;
			}, 500);
		}
	};

	$scope.goLive = function() {
		trackingPixel.trackClick('GOLIVE');


		if (session.checkBan()) {
			return false;
		}
		if (session.isBroadcasting || swf.settingUpBroadcast || (guestService.guest && guestService.guest.userId == session.user.userId)) {
			session.preventBroadcastInterrupt();
			return false;
		}
		if ((config.mcu && (!window.getUserMedia || Api.isMEdge())) || (navigator.userAgent.indexOf("Safari") > -1 && navigator.userAgent.indexOf("Chrome") == -1)) {
			$modal.alert("Sorry, your browser doesn't support YouNow broadcasting. Please upgrade to the latest version of <a href='https://www.mozilla.org/en-US/firefox/new/' target='_blank'>FireFox</a> or <a href='https://www.google.com/chrome/browser/desktop/' target='_blank'>Chrome</a>.");
			return false;
		}
		if ($state.current.name === 'main.channel.detail.endOfBroadcast') {
			$state.go("main.channel.detail");
		}
		broadcasterService.goLive();
		swf.goLive();
		selfies.clearSelfies();
	};

	$scope.goToExplore = function() {
		trackingPixel.trackClick('EXPLORE', {
			field1: 'HEADER'
		});
		$rootScope.gaEvent('Conversion', 'Go To Explore', trackingPixel.getUserLocation() || 'ANCILLARY');
		$state.go('main.explore');
	};

	$scope.getTheApp = function() {
		trackingPixel.trackClick('GETTHEAPP', {
			field1: 'HEADER'
		});
		$modal.mobileDownload(trackingPixel.getUserLocation() || 'ANCILLARY');
	};

	$scope.loginClick = function(event) {
		$rootScope.gaEvent('Conversion', event, trackingPixel.getUserLocation() || 'ANCILLARY');
		trackingPixel.trackClick('SIGNIN');
	};

	$scope.clickLogo = function(language) {
		if (swf.settingUpBroadcast) {
			session.isBroadcasting = true;
		}
		if (session.isBroadcasting || (guestService.guest && guestService.guest.userId == session.user.userId)) {
			session.preventBroadcastInterrupt();
			return false;
		}
		if (session.user && session.user.userId === 0) {
			config.showHomepage = true;
			$state.go('home',{la:language});
		} else {
			broadcasterService.featuredBroadcaster();
		}
	};

	eventbus.subscribe('user:onNotificationCountChange', function() {
		// Only check notifications if dropdown is already open
		if (angular.element(document.getElementById('notifications-dropdown')).hasClass('open')) {
			session.notificationCount = 0;
			session.getNotifications(0);
		}
	}, 'header', $scope);


	// // DOWNLOAD APP POPUP
	// var dapp = {};
	// dapp.notify = function() {
	// 	$modal.mobileDownload();

	// 	Api.store('dapp_shown_count_' + session.user.userId, dapp.shown_count + 1);
	// 	Api.store('dapp_shown_last_' + session.user.userId, Date.now());
	// };
	// dapp.check = function() {
	// 	dapp.shown_count = Api.store('dapp_shown_count_' + session.user.userId);
	// 	dapp.shown_last = Api.store('dapp_shown_last_' + session.user.userId);

	// 	if (!dapp.shown_count) {
	// 		// show right away
	// 		dapp.notify();

	// 	} else if (dapp.shown_count < 10) {
	// 		// second time show after 72hrs
	// 		if (dapp.shown_last + (1000 * 60 * 60 * 72) < Date.now()) { //*60*60
	// 			dapp.notify();
	// 		}

	// 	}
	// };
	// if (session.user.userId && session.user.userId > 0) {
	// 	if (!session.user.isMobileUser) {
	// 		dapp.check();
	// 	}
	// }
	// eventbus.subscribe('session:loggedIn', function(eventName, loggedIn) {
	// 	if (loggedIn && !session.user.isMobileUser) {
	// 		dapp.check();
	// 	}
	// }, 'DOWNLOAD_APP_POPUP', $scope);

}]);
