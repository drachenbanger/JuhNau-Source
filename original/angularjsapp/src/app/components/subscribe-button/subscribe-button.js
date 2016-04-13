angular.module('younow.subscribe-button', [])

.directive('subscribeButton', ["session", "Api", "broadcasterService", "config", "$modal", "$timeout", "eventbus", "$timeout", function(session, Api, broadcasterService, config, $modal, $timeout, eventbus, $timeout) {
	return {
		restrict: 'A', // Directive which is declared as an attribute
		templateUrl: 'angularjsapp/src/app/components/subscribe-button/subscribe-button.tpl.html',
		scope: {
			channel: '=',
			source: '@',
			size: '@'
		},
		link: function(scope, element, attributes) {
			scope.base = config.settings.ServerCDNBaseUrl;
			scope.subStatus = session.subStatus;
			scope.fanStatus = session.fanStatus;
			scope.hidden = true;

			var lastChannel = 0;

			eventbus.subscribe('session:loggedIn', function() {
				scope.checkSub();
			}, 'subscribe-button', scope);

			scope.checkSub = function() {
				if ((scope.channel && scope.channel.userId) && session.user) {
					// banned
					if (!session.user || session.user.banId || session.user.suspendId) {
						scope.hidden = true;
						// not subscribable
					} else if (!scope.channel.isSubscribable || scope.channel.isSubscribable == "0") { // stored as string in backend
						scope.hidden = true;
						// ok
					} else {
						session.getSub(scope.channel.userId);
						scope.hidden = false;
					}
				}
			};

			scope.$watch('channel', function(attrChannel) {
				if (session.user && scope.channel && scope.channel.userId != lastChannel) {
					scope.channel = attrChannel;
					lastChannel = attrChannel.userId;
					scope.checkSub();
				}
			}, true);

			scope.subscribe = function() {
				// not logged in
				if (!session.loggedIn) {
					session.showLoginModal('', 'SUBSCRIBE').result.then(scope.subscribe);
					return false;
				}
				// banned
				if (session.checkBan()) {
					return false;
				}
				// not sub
				if (!session.subStatus[scope.channel.userId]) {
					$modal.subscribeModal(scope.channel.userId, {
						source: scope.source
					});
				}
				// sub
				else if (config && config.settings && config.settings.TrackingHost && (config.settings.TrackingHost.indexOf('-vpc') > 0 || config.settings.TrackingHost.indexOf('-dev') > 0)) {
					Api.get('channel/unSubscribe/userId=' + session.user.userId + '/channelId=' + broadcasterService.broadcaster.userId + '').then(function() {
						window.location.reload();
					});
				}
			};
		}
	};
}])

;
