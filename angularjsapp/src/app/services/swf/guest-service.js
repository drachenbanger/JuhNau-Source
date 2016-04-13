angular.module('younow.services.guest-service', [])

//the factory has all the business logic for controlling the guests State and handling the pusher events for the guest
.factory('guestService', ["swf", "config", "Api", "config", "webRtc", "debug", '$q', '$timeout', "$q", "$filter", "$modal", function(swf, config, Api, config, webRtc, debug, $q, $timeout, $q, $filter, $modal) {

	var guestService = {},
		pcConfig,
		ignoreGuestOnBcPlay = false,
		animationTimeout;

	//STATES
	guestService.state = 'ready';
	guestService.countUpdated = false;
	guestService.guestListCount = 0;
	guestService.listPreferences = {
		filter: 'level',
		dir: undefined
	};
	guestService.overlayStates = {
		broadcaster: 'ready',
		guest: 'ready'
	};

	//Methods for the local guest in the guestlist
	guestService.newUserGuestObj = function(guestInfo) {
		guestService.userGuestObj = new Guest(guestInfo);
	};
	guestService.updateUserGuestObj = function(guestInfo) {
		if (!guestInfo && guestService.userGuestObj) {
			delete guestService.userGuestObj;
		}
	};

	//Methods for current guest broadcaster
	guestService.newGuestObj = function(guestInfo) {
		guestService.guest = new Guest(guestInfo);
	};
	guestService.updateGuestObj = function(guestInfo) {
		if (!guestInfo && guestService.guest) {
			delete guestService.guest;
		}
	};

	guestService.addGuest = function(pcConfig, sdp, broadcasterId, sessionUserId) {
		Api.post('guest/join', {
			sdpOffer: sdp,
			channelId: broadcasterId,
			userId: sessionUserId
		}).then(function(response) {
			if (response.data.errorCode === 0) {
				webRtc.pc.setRemoteDescription(new pcConfig.SessionDescription({
					"sdp": response.data.sdpAnswer,
					"type": "answer"
				}), webRtc.setRemoteDescriptionSuccess, webRtc.setRemoteDescriptionFail);
			} else {
				$timeout(function() {
					resetAllStates();
				}, 1000);
				if (webRtc.getCurrentConfig().webrtcStream) {
					webRtc.destroy(undefined, document.getElementById('guestVideo'));
				}
			}
		});
	};

	guestService.inviteGuest = function(userId, guestId, pendingGuestObj, mode) {
		if (mode === 'direct') {
			guestService.overlayStates.guest = 'inviting';
		} else {
			guestService.overlayStates.guest = 'connecting-broadcaster';
		}
		if (!pendingGuestObj) {
			guestService.newGuestObj(guestService.pendingGuest.guest);
		} else {
			guestService.newGuestObj(pendingGuestObj);
		}
		delete guestService.pendingGuest;
		Api.post('guest/invite', {
			userId: userId,
			guestId: guestId,
			mode: mode || 'guest'
		}).then(function(response) {
			if (response.data.errorCode === 0) {
				if (mode !== 'direct') {
					guestService.state = 'connecting';
				}
			} else {
				resetAllStates();
			}
		});
	};

	guestService.acceptInviteRequest = function() {
		var deferred = $q.defer();
		if (Api.browser.name == 'Firefox') {
			deferred.resolve();
		} else {
			webRtc.getBasicPermissions().then(function(response) {
				if (response && response.id) {
					deferred.resolve();
				} else {
					deferred.reject();
				}
			});
		}

		return deferred.promise;
	};

	guestService.declineInviteRequest = function(broadcasterId, sessionUserId) {
		Api.post('guest/decline', {
			channelId: broadcasterId,
			userId: sessionUserId,
			reason: 'user'
		}).then(function(response) {
			if (response.data.errorCode === 0) {
				resetAllStates();
			}
		});
	};

	guestService.cancelInviteRequest = function(sessionUserId) {
		Api.post('guest/cancel', {
			userId: sessionUserId,
			guestId: guestService.pendingGuest.guest.userId
		}).then(function(response) {
			if (response.data.errorCode === 0) {
				resetAllStates();
			}
		});
	};

	guestService.dropGuest = function(sessionUserId) {
		var deferred = $q.defer();
		var source = swf.broadcast.userId === sessionUserId ? 'broadcaster' : 'user';

		if (source == 'user') {
			ignoreGuestOnBcPlay = true;
		}

		return Api.post('guest/end', {
			channelId: swf.broadcast.userId,
			userId: sessionUserId,
			source: source
		}).then(function(response) {
			if (response.data.errorCode === 0) {
				guestService.updateGuestObj();
				guestService.overlayStates.guest = 'ready';
				guestService.state = 'loading';
				deferred.resolve();
			} else {
				deferred.reject();
			}
			return deferred.promise;
		});
	};

	guestService.getSnapshot = function(eob) {
		swf.activeChatTab = 'GuestSnapshot';
		if (!eob && guestService.guest.snapshot) {
			webRtc.takeGuestSnapshot(document.getElementById('bcVideo'), document.getElementById('guestVideo'))
				.then(function(response) {
					guestService.eobSnapshot = response;
				});
		} else {
			webRtc.takeGuestSnapshot(document.getElementById('bcVideo'), document.getElementById('guestVideo'), guestService.guest.snapshot)
				.then(function(response) {
					guestService.eobSnapshot = response;
				});
		}

		//setup social previous social-sharing interactions
		var bitwiseMap = Api.convertBitwise(swf.broadcast.broadcastShared, 6);
		if (typeof swf.broadcast.shared != 'object') {
			swf.broadcast.shared = {};
		}
		swf.broadcast.shared = {
			"younow": (swf.broadcast.shared.younow ? swf.broadcast.shared.younow : bitwiseMap[0]),
			"twitter": (swf.broadcast.shared.twitter ? swf.broadcast.shared.twitter : bitwiseMap[1]),
			"facebook": (swf.broadcast.shared.facebook ? swf.broadcast.shared.facebook : bitwiseMap[2]),
			"instagram": (swf.broadcast.shared.instagram ? swf.broadcast.shared.instagram : bitwiseMap[3]),
			"tumblr": (swf.broadcast.shared.tumblr ? swf.broadcast.shared.tumblr : bitwiseMap[4]),
			"other": (swf.broadcast.shared.other ? swf.broadcast.shared.other : bitwiseMap[5])
		};

		return swf.snapshotLinks({
			'broadcast': swf.broadcast,
			'guesting': true
		});
	};

	guestService.notifyLogin = function(session) {
		if (swf.broadcast) {
			if (swf.broadcast.guestInfo && swf.broadcast.guestInfo.userId == session.userId) {
				guestService.newUserGuestObj(swf.broadcast.guestInfo);
			} else {
				Api.get('broadcast/info', {
					channelId: swf.broadcast.userId,
					curId: swf.broadcast.userId
				}).then(function(response) {
					if (response.data && response.data.guestInfo) {
						guestService.newUserGuestObj(response.data.guestInfo);
					}
				});
			}
		}
	};

	guestService.notifyLogout = function() {
		guestService.updateUserGuestObj();
	};

	//clean up for a new broadcaster
	guestService.newBroadcaster = function() {
		resetAllStates();
		ignoreGuestOnBcPlay = false;
		guestService.countUpdated = false;

	};

	guestService.onPusherEvent = function(eventName, eventData) {
		debug.console(['GUEST', 'PUSHER'], {
			pusherEvent: eventName,
			pusherData: eventData
		});
		var data = (eventData && eventData.message) ? eventData.message : null;

		if (eventName === 'onGuestConnecting' && data) {
			if (data.guestInfo && !guestService.guest) {
				guestService.newGuestObj(data.guestInfo);
			}

			// connecting for broadcaster and audience
			if ((data.userId != swf.currentSession.userId) && guestService.overlayStates.guest != 'connecting-broadcaster') {
				if (swf.currentSession.userId == swf.broadcast.userId && guestService.state != 'connecting') { //only for broadcaster
					guestService.state = 'connecting';
				}
				guestService.overlayStates.guest = 'connecting-broadcaster';
			}
		}

		if (eventName === 'onGuestConnected' && guestService.overlayStates.guest === 'connecting-broadcaster') {
			webRtc.streamReadyCallback('guestVideo', function() {
				guestService.overlayStates.guest = 'connected';
			});

			if (webRtc.settings.streams.guest) {
				webRtc.pc.reconnectRemoteStream();
			}
		}

		//this is used for the connecting screens to notify the device that the streams have connected and are playing
		if (eventName === 'onGuestBroadcasting' && (guestService.overlayStates.guest === 'connecting' || guestService.overlayStates.guest === 'connecting-broadcaster')) {
			if ((swf.currentSession.userId != data.channelId) && (swf.currentSession.userId != data.userId)) {
				guestService.overlayStates.guest = 'ready';
			} else {
				guestService.overlayStates.guest = 'connected';
			}
			if (guestService.pendingGuest) {
				delete guestService.pendingGuest;
			}
			ignoreGuestOnBcPlay = true;
		}

		if (eventName === 'onBroadcastEnd' && data) {
			guestService.countUpdated = false;
			if (!swf.eob) {
				resetAllStates();
			}
			if (webRtc.getCurrentConfig() !== undefined && webRtc.getCurrentConfig().webrtcStream) {
				webRtc.destroy();
			}
		}

		if (eventName === 'onGuestEnd' && data) {
			if (guestService.guest && guestService.guest.userId == swf.currentSession.userId) {
				guestService.getSnapshot(true);
				guestService.state = 'loading';
				$timeout(function() {
					resetAllStates();
				}, 1000);
				if (webRtc.getCurrentConfig().webrtcStream) {
					webRtc.destroy(undefined, document.getElementById('guestVideo'));
				}
				ignoreGuestOnBcPlay = true;
			} else {
				//if it was a swap and the user has the inviting prompt, let's not make the mistake of clearing it.
				if (guestService.overlayStates.guest == 'inviting-prompt') {
					if (guestService.guest) {
						guestService.updateGuestObj();
					}
					return false;
				}
				//when swapping keep the pendingGuest for better UX
				if (guestService.overlayStates.guest == 'swapping') {
					resetAllStates(true);
				} else {
					resetAllStates();
				}
			}

			if (guestService.guest) {
				guestService.updateGuestObj();
			}
		}
		
		if (eventName == 'onBroadcastPlayData' && data) {
			if (!ignoreGuestOnBcPlay && guestService.overlayStates.guest !== 'connecting' && guestService.overlayStates.guest !== 'connecting-broadcaster' && guestService.overlayStates.guest !== 'inviting') {
				if (data.guestBroadcaster && !ignoreGuestOnBcPlay) {
					if (!guestService.guest) {
						guestService.newGuestObj(data.guestBroadcaster);
					}
					if (guestService.guest && guestService.guest.userId != data.guestBroadcaster.userId) {
						guestService.updateGuestObj();
						guestService.newGuestObj(data.guestBroadcaster);
					}
				}
				if (!data.guestBroadcaster && guestService.guest && !ignoreGuestOnBcPlay) {
					guestService.updateGuestObj();
				}
			}
			//clear the ignore variable immediately after one rotation of onBroadcastPlay
			if (ignoreGuestOnBcPlay) {
				ignoreGuestOnBcPlay = false;
			}
			//list count
			if (data.guestListCount !== undefined && data.guestListCount !== null) {
				if (data.guestListCount > guestService.guestListCount && swf.activeChatTab != 'Guest') {
					guestService.countUpdated = true;
				}
				guestService.guestListCount = data.guestListCount;
				guestService.guestListCountFormatted = Api.trustedHTML((data.guestListCount != 1 ? '<b>' + data.guestListCount + '</b> ' + $filter('translate')('_guests') : '<b>' + data.guestListCount + '</b> ' + $filter('translate')('_guest')));
			}
		}

		if (eventName === 'onGuestInvite' && data && swf.broadcast.userId == data.channelId) {
			if (data.mode === 'guest') {
				Api.showTopNotification('<div class="circle-thumb thumb" style="background-image: url(' + config.settings.ServerCDNBaseUrl + '/php/api/channel/getImage/channelId=' + swf.currentSession.userId + ');"></div><div class="circle-thumb thumb" style="background-image: url(' + config.settings.ServerCDNBaseUrl + '/php/api/channel/getImage/channelId=' + data.channelId + ');"></div> <div>Congratulations! ' + swf.broadcast.profile + ' has selected you as a guest!</div>', 'primary', false, undefined, 4000);
				guestService.state = 'loading';
				guestService.newGuestObj(guestService.userGuestObj);
				guestService.updateUserGuestObj();
			}
		}

		if (eventName === 'onGuestDirectInvite' && data && swf.broadcast.userId == data.channelId) {
			if (data.guestInfo && !guestService.pendingGuest) {
				data.guestInfo.formattedLocation = Api.cleanLocation(data.guestInfo.location);
				guestService.pendingGuest = {
					guest: data.guestInfo
				};
			}

			//guest version
			if (data.userId == swf.currentSession.userId) {
				$timeout.cancel(animationTimeout);
				$timeout(function() {
					guestService.overlayStates.guest = 'inviting-prompt';
				});
			}

			//audience version
			if (data.userId != swf.currentSession.userId && data.channelId != swf.currentSession.userId) {
				$timeout.cancel(animationTimeout);
				$timeout(function() {
					guestService.overlayStates.guest = 'inviting-audience';
				});
			}
		}

		if (eventName === 'onGuestDecline' && data) {
			if (data.userId != swf.currentSession.userId) {
				//create a pendingGuest if there isn't one, in the case a user joined after the request was made.
				if (!guestService.pendingGuest) {
					guestService.pendingGuest = {
						guest: data.guestInfo
					};
				}

				//if timeout and broadcaster we show a different state
				if (swf.broadcast.userId == swf.currentSession.userId && data.reason == "timeout") {
					guestService.overlayStates.guest = 'declined-retry';
					animationTimeout = $timeout(function() {
						if (guestService.overlayStates.guest === 'declined-retry') {
							resetAllStates();
						}
					}, 6000);
				} else {
					guestService.overlayStates.guest = 'declined';
					animationTimeout = $timeout(function() {
						if (guestService.overlayStates.guest === 'declined') {
							resetAllStates();
						}
					}, 2000);
				}
			} else {
				resetAllStates();
			}
		}

		if (eventName === 'onGuestOptIn' && swf.broadcast.userId == data.channelId && data.guestInfo) {
			guestService.newUserGuestObj(data.guestInfo);
		}
		if (eventName === 'onGuestOptOut' && swf.broadcast.userId == data.channelId) {
			if (guestService.userGuestObj) {
				guestService.updateUserGuestObj();
			}
		}

		if (eventName === 'onGuestJoinFail') {
			resetAllStates();
		}

		if (eventName === 'onGuestCancel' && data.channelId) {
			if (swf.currentSession.userId != data.channelId) { //audience and guest only
				$timeout.cancel(animationTimeout);
				resetAllStates();
			}
		}

		//PUBLIC EVENTS
		// onGuestConnected
		// onGuestEnd
		// onGuestBroadcasting
		// onGuestConnecting
		// onGuestDirectInvite
		// onGuestCancel
		// onGuestDecline
		// onGuestJoinFail

		// GUEST ONLY EVENTS
		// onGuestInvite
		// onGuestOptIn
		// onGuestOptOut

		//BROADCASTER ONLY EVENTS
		// onGuestListUpdate

	};

	guestService.preventGuestingInterrupt = function() {
		$modal.alert($filter('translate')('guesting_cant'));
	};

	function Guest(info) {
		this.bars = info.bars;
		this.chatRole = info.chatRole;
		this.fanRank = info.fanRank;
		this.level = info.level;
		this.locale = info.locale;
		this.location = info.location;
		this.formattedLocation = info.location ? Api.cleanLocation(info.location) : '';
		this.name = info.name;
		if (info.snapshotUrl) {
			this.snapshotUrl = info.snapshotUrl;
			this.snapshot = (config.settings.GuestSnapshotsBaseUrl + info.snapshotUrl);
		}
		this.subscriptionType = info.subscriptionType;
		this.userId = info.userId;
	}

	function resetAllStates(keepPendingGuest) {
		if (guestService.state != 'ready') {
			guestService.state = 'ready';
		}
		if (guestService.overlayStates.guest != 'ready') {
			guestService.overlayStates.guest = 'ready';
		}
		if (guestService.overlayStates.broadcaster != 'ready') {
			guestService.overlayStates.broadcaster = 'ready';
		}
		if (!keepPendingGuest && guestService.pendingGuest) {
			//we do a timeout for a smooth transition
			animationTimeout = $timeout(function() {
				delete guestService.pendingGuest;
			}, 3000);
		}
	}

	return guestService;
}])

.directive('broadcastStream', ["webRtc", "swf", "session", "guestService", function(webRtc, swf, session, guestService) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs, controller) {
			if (swf.broadcast && swf.broadcast.userId != session.user.userId) {
				guestService.overlayStates.broadcaster = 'connecting';
				webRtc.streamReadyCallback('bcVideo', function() {
					guestService.overlayStates.broadcaster = 'connected';
				});
			}
		}
	};
}])


//this is just used for us to bootstrap the video element and make the webRTC request so that we don't have to rely on the service
.directive('guestStream', ["webRtc", "Api", "swf", "session", "broadcasterService", "guestService", function(webRtc, Api, swf, session, broadcasterService, guestService) {
	return {
		restrict: 'A',
		scope: {},
		link: function(scope, element, attrs, controller) {
			var pcConfig;

			if (!swf.settingUpBroadcast && swf.broadcast && swf.broadcast.userId != session.user.userId && !session.isBroadcasting) {
				guestService.overlayStates.guest = 'connecting';
				webRtc.initialize(onIceCandidate, true)
					.then(function(response) {
						webRtc.setupWebrtcStream();
						guestService.state = 'connected';
					});
			}

			function onIceCandidate(event) {
				if (event.candidate) {
					console.log("Sending Ice Candidate:\n" + JSON.stringify({
						"id": "broadcaster",
						"candidate": event.candidate
					}));
				} else {
					pcConfig = webRtc.getCurrentConfig();
					guestService.addGuest(pcConfig, webRtc.pc.localDescription.sdp, swf.broadcast.userId, session.user.userId);
					webRtc.setStatus("End of candidates, sending sdp to server.");
					pcConfig.streamReady = true;

				}
			}
		}
	};
}])

;
