angular.module('younow.guest-button', [])

.directive('guestButton', function(swf, guestService, session, Api, trackingPixel, webRtc, config, selfies) {
	return {
		restrict: 'A',
		templateUrl: 'angularjsapp/src/app/components/guest-button/guest-button.tpl.html',
		scope: {
			channel: '=',
			onInvite: '&'
		},
		link: function(scope, element, attributes) {
			//if you're the broadcaster, you can have guests, your browser supports webRtc and the guest you have isn't the same person
			if (swf.broadcast && (swf.broadcast.userId === session.user.userId) && swf.broadcast.allowGuestCallers == "1" && webRtc.supportsWebRtc()) {
				scope.hidden = false;
			} else {
				scope.hidden = true;
			}

			if (!scope.hidden) {
				element.on('click', function() {
					if (guestService.overlayStates.guest != 'ready' && guestService.overlayStates.guest != 'connected') {
						return false;
					}
					//clear out the selfies if a guest is selected
					if(selfies.currentSelfie !== undefined) {
						selfies.clearSelfies(swf.broadcast.userId, session.user.userId);
					}
					trackingPixel.capture({
						'event': 'CLICK',
						'extradata': 'GUESTBROADCASTING',
						'field1': 'BROADCASTER_INVITE_GUEST'
					});
					var pendingGuest = new PendingGuest();
					if (guestService.overlayStates.guest == 'connected') {
						guestService.overlayStates.guest = 'swapping';
						guestService.pendingGuest = {
							guest: pendingGuest
						};
						scope.onInvite();
					} else {
						guestService.inviteGuest(session.user.userId, scope.channel.userId, pendingGuest, 'direct');
						scope.onInvite();
					}
				});

				scope.$watch(function() {
					return guestService.overlayStates.guest;
				}, function(newVal) {
					if (newVal) {
						if (newVal != 'ready' && newVal != 'connected') {
							element.children().addClass('disabled');
						} else {
							element.children().removeClass('disabled');
						}
					}
				});

				//check if the channel is the broadcaster (hide if it is)
				var waitOnChannel = scope.$watch(function() {
					return scope.channel;
				}, function(newVal) {
					if (newVal !== undefined) {
						//unbind the watcher no need for it anymore.
						waitOnChannel();
						if (swf.broadcast && (swf.broadcast.userId == newVal.userId || (guestService.guest && guestService.guest.userId == newVal.userId))) {
							scope.hidden = true;
						}
						isUserInvitable(newVal.userId).then(function(response) {
							if (response.data.errorCode === 0 && response.data.isInvitable !== undefined) {
								if (response.data.isInvitable != 1) {
									scope.hidden = true;
								}
							}
						});

					}
				});
			}

			//constructor function to make a pendingGuest object, in the guest list this is given to us... we only take the things we need for the overlay
			function PendingGuest() {
				this.location = {
					state: scope.channel.state,
					country: scope.channel.country,
					city: scope.channel.city
				};
				this.formattedLocation = this.location ? Api.cleanLocation(this.location) : '';
				this.name = scope.channel.profile;
				this.userId = scope.channel.userId;
				this.level = scope.channel.level;
				this.locale = scope.channel.locale;
				this.mode = 'direct';
				//empty fields we don't care about
				this.bars = '';
				this.chatRole = '';
				this.fanRank = '';
				this.snapshotUrl = '';
				this.subscriptionType = '';
			}

			function isUserInvitable(guestId) {
				return Api.post('guest/isinvitable', {
					userId: session.user.userId,
					guestId: guestId
				});
			}
		}
	};
})

;
