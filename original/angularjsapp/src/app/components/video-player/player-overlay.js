angular.module('younow.channel.player-overlay', [])

.factory('playerOverlayService', function() {
	var service = {};
	service.expose = function(name, callback) {
		service[name] = callback;
	};
	service.destroyExposed = function(name) {
		if (service[name]) {
			service[name] = null;
		}
	};
	return service;
})

.controller('PlayerOverlayCtrl', ["$scope", "$element", "swf", "$interval", "$window", "config", "$timeout", "Api", "broadcasterService", "session", "$rootScope", "$modal", "eventbus", "webRtc", "guestService", "trackingPixel", "playerOverlayService", "externalStreamer", function($scope, $element, swf, $interval, $window, config, $timeout, Api, broadcasterService, session, $rootScope, $modal, eventbus, webRtc, guestService, trackingPixel, playerOverlayService, externalStreamer) {

	var vm = this,
		introVideo,
		beforeVol;

	vm.Math = $window.Math;
	vm.swf = swf;
	vm.session = session;
	vm.broadcast = broadcasterService;
	vm.baseUrl = config.settings.ServerCDNBaseUrl;
	vm.baseAnimationsUrl = config.settings.ServerCDNBaseUrl + '/angularjsapp/src/assets/animations';
	vm.giftOverlayUrl = config.settings.ServerCDNBaseUrl + '/angularjsapp/src/assets/images/icons_v3/_gifts/_overlay';
	vm.thumb = config.settings.ServerCDNBaseUrl + '/php/api/channel/getImage/channelId=';
	vm.noThumb = config.settings.ServerCDNBaseUrl + '/images/nothumb.jpg';
	vm.pulseAnimation = config.settings.ServerCDNBaseUrl + '/angularjsapp/src/assets/animations/pulse-animation.gif';
	vm.gift = false;
	vm.systemMessage = {};
	vm.systemMessage.hasMessage = false;
	vm.dropBroadcastActive = false;
	vm.online = navigator.onLine;
	vm.mirroredCamera = Api.store('mirrorCamera');
	vm.globalVars = window.globalVars;
	vm.config = config;
	vm.guestService = guestService;

	// GIFT
	var giftTimeout;
	var messageTimeout;

	var giftsUntil = Date.now();
	var setGift = function() {
		// get ready
		$timeout.cancel(giftTimeout);
		if (vm.gift) {

			// clear gift
			//console.log('Last gift '+vm.gift.SKU+'shown for '+(Date.now() - vm.gift.shownAt)+'');
			vm.gift = false;
			$timeout.cancel(giftTimeout);

			// set after animation
			if (swf.giftOverlayQueue && swf.giftOverlayQueue[0]) {
				giftTimeout = $timeout(setGift, 1000);
				return false;
			}
		}

		// nothing to set
		if (!swf.giftOverlayQueue || !swf.giftOverlayQueue[0]) {
			return false;
		}

		// set
		vm.gift = swf.giftOverlayQueue[0];
		vm.gift.shownAt = Date.now();
		vm.giftUserId_lastingValue = vm.gift.userId;
		swf.giftOverlayQueue.splice(0, 1);
		vm.gift.comment = vm.gift.comment.replace(/just /gi, '');
		vm.gift.SKU = swf.giftSkus[vm.gift.giftId];
		vm.gift.info = swf.giftObjects[vm.gift.SKU];

		console.log('vm.gift',vm.gift);
		// subscription
		if (vm.gift.info.itemGameType == 'SUBSCRIPTION') {
			$timeout(function() {
				vm.gift.animateSubs = true;
			}, 500);
		}

		// min
		var minVis = 3000;
		if (vm.gift && vm.gift.info && vm.gift.info.minVis) {
			minVis = vm.gift.info.minVis + 0;
		}
		vm.gift.minTime = Math.max(giftsUntil, Date.now()) + (minVis);

		// max
		var maxVis = 10000;
		if (vm.gift && vm.gift.info && vm.gift.info.maxVis) {
			maxVis = vm.gift.info.maxVis + 0;
		}
		// cleanup
		giftTimeout = $timeout(setGift, maxVis);

		// log
		//console.log('Show '+vm.gift.SKU+' for '+vm.gift.info.minVis+' to '+vm.gift.info.maxVis);
	};
	var onGift = function() {
		// not ready
		if (vm.onGiftTimeout) {
			$timeout.cancel(vm.onGiftTimeout);
			vm.onGiftTimeout = undefined;
		}
		if (!swf.giftSkus) {
			vm.onGiftTimeout = $timeout(onGift, 250);
			return false;
		}
		// ok
		var now = Date.now();
		if (!vm.gift || vm.gift.minTime <= now) {
			// now
			setGift();
		} else {
			// later
			$timeout.cancel(giftTimeout);
			giftTimeout = $timeout(setGift, vm.gift.minTime - now);
		}
	};
	playerOverlayService.expose('onGift', onGift);

	function onSystemMessage() {
		if (swf.systemMessagesQueue && swf.systemMessagesQueue.length > 0 && !vm.systemMessage.hasMessage) {
			vm.systemMessage.message = swf.systemMessagesQueue[0];
			vm.systemMessage.message.trustedMessage = Api.trustedHTML(Api.linkify(vm.systemMessage.message.web));
			vm.systemMessage.hasMessage = true;
			messageTimeout = $timeout(function() {
				vm.systemMessage.dismissed = false;
				vm.systemMessage.hasMessage = false;
				swf.systemMessagesQueue.splice(0, 1);
				$timeout(function() {
					onSystemMessage();
				}, 1000);
			}, (vm.systemMessage.message.webTime || 3) * 1000);
		}
	}

	playerOverlayService.expose('onSystemMessage', onSystemMessage);

	function clearOverlay(event, data) {
		if (data && data.type == 'fullscreen') {
			return false;
		}
		vm.systemMessage.hasMessage = false;
		vm.gift = false;
		vm.dropBroadcastActive = false;
		$timeout.cancel(messageTimeout);
		if (vm.gift) {
			$timeout.cancel(giftTimeout);
		}
	}

	vm.suppressGiftOverlays = function() {
		if (guestService.overlayStates.guest === 'ready' || guestService.overlayStates.guest === 'connected') {
			return false;
		} else {
			return true;
		}
	};

	vm.isProposalGift = function(giftId) {
		if (!giftId) {
			return false;
		}
		if (swf.giftSkus[giftId] === 'PROPOSAL_RING') {
			return true;
		}
		return false;
	};

	vm.dropBroadcast = function(confirmation) {
		swf.snapshot = undefined;
		if (confirmation !== undefined) {
			vm.dropBroadcastActive = confirmation;
			return false;
		}
		if (session.user && session.user.userId && !swf.eob) {
			broadcasterService.dropBroadcast(session.user.userId).then(function() {
				externalStreamer.reset();
			});
			if (config.mcu == "1") {
				webRtc.destroy();
			}
			delete broadcasterService.bcMedia;
			session.isBroadcasting = false;
		}
	};

	vm.cancelBroadcast = function() {
		swf.snapshot = undefined;
		swf.invokeSwfMethod('cancelBroadcast');
		if (config.mcu === "1") {
			webRtc.destroy();
		}
		broadcasterService.dropBroadcast(session.user.userId);
		externalStreamer.reset();
		swf.settingUpBroadcast = false;
		window.YouNow.App.loadChannel({
			channelId: swf.broadcast.userId,
			isBroadcasting: false
		});
	};

	vm.mirrorCamera = function() {
		var mirrorCamera = Api.store('mirrorCamera');
		if (!mirrorCamera) {
			Api.store('mirrorCamera', true);
		} else {
			Api.store('mirrorCamera', false);
		}
		vm.mirroredCamera = Api.store('mirrorCamera');
		if (config.mcu != '1') {
			swf.invokeSwfMethod('mirror', vm.mirroredCamera);
		} else {
			webRtc.settings.mirroredCamera = vm.mirroredCamera;
		}
	};

	vm.openProfile = function($event) {
		$rootScope.gaEvent('FEATURE', 'clickvideo', config.UILocale);
		$modal.profileSummary(swf.broadcast.userId);
	};

	vm.dropGuestAsBroadcaster = function() {
		if (guestService.overlayStates.guest != 'dropping') {
			guestService.overlayStates.guest = 'dropping';
		}
	};

	vm.dropGuestAsGuest = function() {
		guestService.dropGuest(session.user.userId);
		vm.dropBroadcastActive = false;
		trackingPixel.capture({
			'event': 'CLICK',
			'extradata': 'GUESTBROADCASTING',
			'field1': 'GUEST_END_CALL'
		});
	};

	vm.dropGuestAsGuestCancel = function() {
		vm.dropBroadcastActive = false;
		trackingPixel.capture({
			'event': 'CLICK',
			'extradata': 'GUESTBROADCASTING',
			'field1': 'GUEST_END_CANCEL'
		});
	};

	vm.dismissSystemMessage = function() {
		if (messageTimeout) {
			$timeout.cancel(messageTimeout);
		}
		vm.systemMessage.dismissed = true;
		$timeout(function() {
			vm.systemMessage.dismissed = false;
			vm.systemMessage.hasMessage = false;
			swf.systemMessagesQueue.splice(0, 1);
			onSystemMessage();
		}, 1000);
	};

	vm.randomGuest = function() {
		Api.get('guest/random', {
			channelId: session.user.userId
		}).then(function(response) {
			if (response.data && response.data.guestInfo) {
				guestService.overlayStates.guest = 'swapping';
				guestService.pendingGuest = {
					guest: response.data.guestInfo
				};
			}
		});
	};

	//clean up and/or subscribe with built in cleanup phase
	eventbus.subscribe('swf:reset', clearOverlay, 'overlay', $scope);
	eventbus.subscribe('pusher:ban', function(event, message) {
		//kill the broadcast if the user gets banned/suspended mid broadcast
		if (session.user && !swf.settingUpBroadcast && broadcasterService.broadcaster && broadcasterService.broadcaster.userId == session.user.userId) {
			vm.dropBroadcast();
		}
	}, 'overlay', $scope);

	$scope.$on('$destroy', function() {
		if (vm.gift) {
			$timeout.cancel(giftTimeout);
		}
		if (messageTimeout) {
			$timeout.cancel(messageTimeout);
		}
		playerOverlayService.destroyExposed('onGift');
		playerOverlayService.destroyExposed('onSystemMessage');
	});

}])

.directive('playerOverlay', function() {
	return {
		restrict: 'A',
		templateUrl: 'angularjsapp/src/app/components/video-player/player-overlay.tpl.html',
		controller: 'PlayerOverlayCtrl',
		controllerAs: 'vm',
		scope: {}
	};
})

;
