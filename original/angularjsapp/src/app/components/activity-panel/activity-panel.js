angular.module('younow.activity-panel', [
	'ui.router'
])

.directive('activityPanel', ["$http", "$window", "broadcasterService", "Api", "swf", "session", "config", "trackingPixel", "guestService", function($http, $window, broadcasterService, Api, swf, session, config, trackingPixel, guestService) {
	return {
		restrict: 'A', // Directive which is declared as an attribute
		templateUrl: 'angularjsapp/src/app/components/activity-panel/activity-panel.tpl.html',
		scope: {
			onlineFriends: '=',
			source: '@'
		},
		link: function(scope) {

			scope.panel = {};
			scope.panel.cdn = {
				thumb: config.settings.ServerCDNBaseUrl + '/php/api/channel/getImage/channelId=',
				nothumb: config.settings.ServerCDNBaseUrl + '/images/nothumb.jpg',
				base: config.settings.ServerCDNBaseUrl
			};

			scope.panel.panelCollapsed = false;

			scope.panel.trackClickFriend = function(friend, source, $index) {
				trackingPixel.trackClick(source.toUpperCase(), {
					doorid: friend.userId,
					field1: (friend.status == 2 ? 'LIVE' : 'VIEWING'),
					sourceid: (($index >= 0) ? $index + 1 : 0)
				});
			};

			scope.panel.changeBroadcaster = function(channel, source) {
				if (swf.settingUpBroadcast) {
					session.isBroadcasting = true;
				}
				if (session.isBroadcasting || (guestService.guest && guestService.guest.userId == session.user.userId)) {
					session.preventBroadcastInterrupt();
					return false;
				}
				if ((swf.broadcast && broadcasterService && !broadcasterService.async) && channel == broadcasterService.broadcaster.userId) {
					return false;
				}
				broadcasterService.channelSwitch = source;
				broadcasterService.switchBroadcaster(channel);
			};

		}
	};
}])

;
