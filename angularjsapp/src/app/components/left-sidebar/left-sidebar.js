angular.module('younow.leftsidebar', [])

.directive('leftsidebar', function(ab, broadcasterService, $rootScope, trackingPixel, config) {
	return {
		restrict: 'A', // Directive which is declared as an attribute
		templateUrl: 'angularjsapp/src/app/components/left-sidebar/left-sidebar.tpl.html',
		controller: 'LeftSidebarCtrl',
		controllerAs: 'leftSidebar'
	};
})

.controller('LeftSidebarCtrl', function ($scope, $rootScope, broadcasterService, dashboard, session, swf, config, Api, $state, trackingPixel, guestService, ab) {
	var leftSidebar = this;
		config.init.then(function() {
			leftSidebar.WEB_NAV = 'angularjsapp/src/app/services/ab/WEB_NAV/' + ab.variant('WEB_NAV') + '.tpl.html';
		});
	$scope.leftSidebar.baseImages = config.settings.ServerCDNBaseUrl + '/angularjsapp/src/assets/images';

	$scope.session = session;

	// fetch trending items and attach to the view
	leftSidebar.dashboard = dashboard;

	// When a trending item is selected, it is sent to the broadcaster service
	leftSidebar.broadcasterService = broadcasterService;

	leftSidebar.usersTrendingCollapsed = false;
	leftSidebar.usersFeaturedCollapsed = false;
	leftSidebar.tagsTrendingCollapsed = false;
	leftSidebar.friendsCollapsed = false;
	leftSidebar.mobileCollapsed = false;

	leftSidebar.session = session;

	leftSidebar.getTagFeatured = function(tag) {
		trackingPixel.trackClick('TAG', {
			field1: 'SIDEBAR'
		});

		if (swf.settingUpBroadcast) {
			session.isBroadcasting = true;
		}
		if (session.isBroadcasting || (guestService.guest && guestService.guest.userId == session.user.userId)) {
			session.preventBroadcastInterrupt();
			return false;
		}
		// track
		$rootScope.gaEvent('Conversion', 'Click Tag', trackingPixel.getUserLocation() || 'ANCILLARY');
		// continue
		session.isBroadcasting = 0;
		broadcasterService.channelSwitch = "TAG";
		swf.settingUpBroadcast = false;
		//go
		$state.go('main.explore', {
			tag: tag,
			q: undefined
		}, {
			reload: true
		});
	};

	leftSidebar.changeBroadcaster = function(id, channelSwitch) {
		trackingPixel.trackClick('BROADCASTER');

		if (swf.settingUpBroadcast) {
			session.isBroadcasting = true;
		}
		if ((session.isBroadcasting || (guestService.guest && guestService.guest.userId == session.user.userId)) && !broadcasterService.async) {
			session.preventBroadcastInterrupt();
			return false;
		}
		if ((swf.broadcast && broadcasterService && !broadcasterService.async) && id == broadcasterService.broadcaster.userId && $state.current.name === 'main.channel.detail') {
			return false;
		}
		broadcasterService.switchBroadcaster(id);
		swf.settingUpBroadcast = false;
		broadcasterService.channelSwitch = channelSwitch;
	};

	leftSidebar.trackMobile = function(platform) {
		if (platform == 'IOS' || platform == 'ANDROID') {
			trackingPixel.trackClick('GETTHEAPP', {
				field1: 'SIDEBAR'
			});
		}
		var activity;
		if (broadcasterService.async && $state.current.name !== 'main.settings' && $state.current.name !== 'about' && $state.current.name !== 'policy' && $state.current.name !== 'main.explore' && $state.current.name !== 'lockout') {
			activity = 'PROFILE';
		}
		if (!broadcasterService.async) {
			activity = 'BROADCAST';
		}
		if ($state.current.name === 'main.explore') {
			activity = 'EXPLORE';
		}
		if (activity === undefined) {
			activity = 'OTHER';
		}
		Api.goMobile(platform, session.user.level, '_SIDEBAR', activity);
	};

})

;
