angular.module('younow.channel.mini-overlay', [])

.directive('miniOverlay', function(guestService, $modal, swf, session, $interval, config, trackingPixel, $timeout) {
	return {
		restrict: 'E',
		templateUrl: 'angularjsapp/src/app/components/video-player/mini-overlay.tpl.html',
		scope: {
			type: '@'
		},
		link: function(scope, element, attributes) {
			scope.config = config;
			scope.guest = guestService.guest;
			scope.swf = swf;
			scope.session = session;

			scope.$watch(function() {
				return guestService.overlayStates[scope.type];
			}, function(newVal) {
				if (newVal) {
					if (newVal != 'ready' && newVal != 'connected') {
						scope.state = scope.type + ' active ' + newVal;
						if (newVal == 'connecting-broadcaster' || newVal == 'inviting') {
							scope.profile = guestService.guest.name;
							scope.guest = guestService.guest;
						}
						if (newVal == 'dropping') {
							guestService.overlayStates.guest = 'dropping';
						}
						if (newVal == 'swapping' || newVal == 'inviting' || newVal == 'declined' || newVal == 'inviting-prompt' || newVal == 'inviting-audience' || newVal == 'declined-retry') {
							scope.pendingGuest = guestService.pendingGuest;
						}
					} else {
						scope.state = scope.type;
					}
				}
			});

			if (scope.type === 'guest') {
				element.on('mouseenter', function() {
					//logic for showing guest info
					if (guestService.overlayStates[scope.type] === 'ready' && isViewer()) {
						scope.state = angular.copy(scope.state) + ' hover';
					}
					if (guestService.guest) {
						scope.profile = guestService.guest.name;
					}
				});

				element.on('mouseleave', function() {
					scope.state = scope.state.replace('hover', '');
				});

				element.on('click', function() {
					if ((guestService.overlayStates[scope.type] === 'ready' || guestService.overlayStates[scope.type] === 'connected') && guestService.guest) {
						$modal.profileSummary(guestService.guest.userId, {
							source: 'GUESTLIVE'
						});
						trackingPixel.capture({
							'event': 'CLICK',
							'extradata': 'GUESTBROADCASTING',
							'field1': 'VIEWER_GUEST'
						});
					}
				});
			}

			if (scope.type === 'broadcaster') {
				element.on('mouseenter', function() {
					if (guestService.overlayStates[scope.type] === 'ready' && isViewer()) {
						scope.state = angular.copy(scope.state) + ' hover';
					}
				});

				element.on('mouseleave', function() {
					scope.state = scope.state.replace('hover', '');
				});

				element.on('click', function() {
					if (guestService.overlayStates[scope.type] === 'ready' || guestService.overlayStates[scope.type] === 'connected') {
						$modal.profileSummary(swf.broadcast.userId);
						trackingPixel.capture({
							'event': 'CLICK',
							'extradata': 'GUESTBROADCASTING',
							'field1': 'VIEWER_HOST'
						});
					}
				});

				scope.profile = swf.broadcast.profile;
				//always rebind the broadcaster's name
				scope.$watch(function() {
					return swf.broadcast.profile;
				}, function(newVal) {
					if (scope.profile != newVal) {
						scope.profile = newVal;
					}
				});
			}

			scope.cancelDrop = function() {
				$timeout(function() {
					guestService.overlayStates.guest = 'connected';
					trackingPixel.capture({
						'event': 'CLICK',
						'extradata': 'GUESTBROADCASTING',
						'field1': 'BROADCASTER_END_CANCEL'
					});
				});
			};

			scope.cancelSwap = function() {
				$timeout(function() {
					guestService.overlayStates.guest = 'connected';
					delete guestService.pendingGuest;
				});
			};

			scope.confirmDrop = function() {
				guestService.dropGuest(session.user.userId);
			};

			scope.confirmSwap = function() {
				guestService.dropGuest(session.user.userId).then(function() {
					if (guestService.pendingGuest.guest.mode == 'direct') {
						guestService.inviteGuest(session.user.userId, guestService.pendingGuest.guest.userId, undefined, 'direct');
					} else {
						guestService.inviteGuest(session.user.userId, guestService.pendingGuest.guest.userId);
					}
				});
			};

			scope.declineInvite = function() {
				guestService.declineInviteRequest(swf.broadcast.userId, session.user.userId);
				trackingPixel.capture({
					'event': 'CLICK',
					'extradata': 'GUESTBROADCASTING',
					'field1': 'GUEST_DECLINE'
				});
			};

			scope.cancelInvite = function() {
				guestService.cancelInviteRequest(session.user.userId);
				trackingPixel.capture({
					'event': 'CLICK',
					'extradata': 'GUESTBROADCASTING',
					'field1': 'BROADCASTER_CANCEL_INVITE'
				});
			};

			scope.acceptInvite = function() {
				scope.loadingPermissions = true;
				guestService.acceptInviteRequest().then(function() {
					trackingPixel.capture({
						'event': 'CLICK',
						'extradata': 'GUESTBROADCASTING',
						'field1': 'GUEST_GO_LIVE'
					});
					//resolved and permissions were granted
					scope.loadingPermissions = false;
					guestService.state = 'loading';
					guestService.newGuestObj(guestService.pendingGuest.guest);
				});
			};

			scope.retryDirectInvite = function() {
				guestService.inviteGuest(session.user.userId, guestService.pendingGuest.guest.userId, undefined, 'direct');
				trackingPixel.capture({
					'event': 'CLICK',
					'extradata': 'GUESTBROADCASTING',
					'field1': 'BROADCASTER_RETRY_YES'
				});
			};

			scope.cancelRetry = function() {
				guestService.overlayStates.guest = 'ready';
				$timeout(function() {
					delete guestService.pendingGuest;
				}, 3000);
				trackingPixel.capture({
					'event': 'CLICK',
					'extradata': 'GUESTBROADCASTING',
					'field1': 'BROADCASTER_RETRY_NO'
				});
			};

			function isViewer() {
				if (guestService.guest && (swf.broadcast.userId != session.user.userId) && (guestService.guest.userId != session.user.userId)) {
					return true;
				} else {
					return false;
				}
			}
		}
	};
})

;
