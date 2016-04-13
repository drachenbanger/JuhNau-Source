angular.module('younow.services.swf', [])

.directive('swfstudio', function($window, $timeout, $modal, config, swf, session, $rootScope, trackingPixel) {
	return {
		restrict: 'A', // Directive which is declared as an attribute
		link: function link(scope, element, attrs) {
			config.init.then(function() {
				var url = config.settings.ServerCDNBaseUrl + '/swf/Player.swf?ver=' + config.settings.FLASH_VER_APPEND,
					id = 'flashObj1',
					width = '592',
					height = '444',
					version = '11.0.0',
					flashvars = {
						splashScreen: '1',
						etpl: 'VS',
						configUrl: config.settings.ServerCDNBaseUrl + '/php/api/younow/config',
						defaultSpeakerVolume: '0.8'
					},
					params = {
						allowscriptaccess: "always",
						allownetworking: "all",
						quality: "high",
						bgcolor: "#FFFFFF",
						allowfullscreen: 'true',
						wmode: "transparent"
					},
					attributes = {};
				swf.bootingFlash = true;

				$timeout(function() {
					function callbackFn(e) {
						swf.bootingFlash = false;
						angular.element(e.ref).on('mousedown', function(event) {
							if (event.offsetY > 40 && !swf.settingUpBroadcast && swf.broadcast.userId !== session.user.userId && event.which !== 3) {
								$rootScope.gaEvent('FEATURE', 'clickvideo', config.UILocale);
								trackingPixel.capture({
									'event': 'CLICK',
									'extradata': 'GUESTBROADCASTING',
									'field1': 'VIEWER_BROADCASTER'
								});
								$modal.profileSummary(swf.broadcast.userId);
							}
						});
					}
					$window.swfobject.embedSWF(url, id, width, height, version, false, flashvars, params, attributes, callbackFn);
				}, 0);
			});
		}
	};
})

.factory('swf', ["$http", "$window", "$location", "$rootScope", "$modal", "config", "Api", "dashboard", "$timeout", "$interval", "$filter", "$q", "eventbus", "debug", "playerOverlayService", "chatService", "$state", "upload", function($http, $window, $location, $rootScope, $modal, config, Api, dashboard, $timeout, $interval, $filter, $q, eventbus, debug, playerOverlayService, chatService, $state, upload) {

	var swf = {};
	swf.anon = false;
	// The SWF triggers calls on the YouNow.App namespace
	// Handle them all (to prevent errors), but only use what is needed
	if (!$window.YouNow) {
		$window.YouNow = {};
	}
	$window.YouNow.App = {};
	var app = $window.YouNow.App;
	var bcSetupTime = {};

	// These are flash calls that are actually handled
	app.init = function() {
		$rootScope.$evalAsync(function() {
			// Handle when flash is reloaded after navigation
			if (swf.broadcast && !queue.init.changeChannel && !swf.settingUpBroadcast && swf.broadcast.mcuEnabled == "1") {
				swf.invokeSwfMethod('changeChannel', swf.broadcast);
			}

			//set initial volume to 0
			if (swf.bootingFlash) {
				swf.invokeSwfMethod('setVolume', 0);
			} else {
				swf.setVolume(Api.store('younowVol'));
			}

			// Check for an existing session, and notify login if needed
			if (swf.sessionData && swf.sessionData.userId) {
				swf.notifyLogin(swf.sessionData);
			}

			// Init
			swf.init = true;
			swf.object = document.getElementById('flashObj1');
			resolveQueue('init');

		});
	};

	app.ready = function() {
		$rootScope.$evalAsync(function() {
			swf.ready = true;
			resolveQueue('ready');
		});
	};

	// Used for remembering the mute state of the swf between apps
	//TESTED
	app.muted = function(muteState) {
		var newVolume = muteState ? 0 : 100;
		swf.setVolume(newVolume, true);
	};


	app.loadChannel = function(options) {
		// The channel service watches this variable and updates when it changes
		swf.loadChannel = options;
	};

	app.getShareUrl = function(options) {
		options = JSON.parse(options);
		options.inviteStr = swf.broadcast.userId; // Override invite string with channel id
		var url = Api.buildShareUrl(options);
		return JSON.stringify({
			shareUrl: url
		});
	};

	app.shareSocialNetwork = function(options) {
		options = JSON.parse(options);
		options.inviteStr = swf.broadcast.userId; // Override invite string with channel id
		options.url = Api.buildShareUrl(options);
		if (options.network === 'facebook') {
			window.FB.ui({
				method: 'feed',
				link: options.url,
				name: Api.buildFacebookCopy(options)
			});
		}
		if (options.network === 'twitter') {
			var copy = Api.buildTwitterCopy(options);
			var url = 'https://twitter.com/intent/tweet?text=' + window.encodeURIComponent(copy);
			Api.openPopup('Twitter', url);
		}
	};

	app.stateChange = function(state) {
		if (swf.broadcast && swf.broadcast.broadcastId) {
			debug.console(['SWF', 'STATE'], state + ' ' + swf.broadcast.broadcastId);
		} else {
			debug.console(['SWF', 'STATE'], state);
		}
		// Clear buffering animation if state changes to playing
		if (state === 'BUFFERING') {
			$rootScope.$evalAsync(function() {
				swf.playState = state;
			});
		}
		// Clear buffering animation if state changes to playing
		if ((swf.playState === 'BUFFERING' || swf.playState === 'RECONNECT') && state === 'PLAYING') {
			$timeout(function() {
				$rootScope.$evalAsync(function() {
					if (swf.broadcast.mirror == '1' && !swf.broadcast.guestBroadcaster) {
						swf.invokeSwfMethod('mirror', true);
					} else {
						swf.invokeSwfMethod('mirror', false);
					}
					swf.playState = state;
				});
			}, 1500);
		}

		if (state === 'BUFFERING' && swf.broadcast && swf.currentSession && ( swf.broadcast.userId != swf.currentSession.userId) ) {
			$rootScope.$evalAsync(function() {
				swf.loadingBroadcasterState = 'NEXT';
				if (!swf.settingUpBroadcast && swf.oldTfl) {
					swf.broadcast.tfl = swf.oldTfl;
				}
				if (!swf.settingUpBroadcast) {
					swf.currentSession.isBroadcasting = false;
				}
			});
		}

		if (state == 'PLAYING' || swf.broadcast && swf.currentSession && swf.broadcast.userId == swf.currentSession.userId) {
			$timeout(function() {
				swf.loadingBroadcasterState = false;
				swf.sharePanelOpen = false;
			}, 1500);
		}

		if (state === 'RECONNECT') {
			$rootScope.$evalAsync(function() {
				swf.loadingBroadcasterState = 'RECONNECT';
				swf.playState = state;
			});
		}
	};

	app.shareBroadcast = function(type, broadcastId) {
		swf.getShareData(type, broadcastId, false, true).then(function(data) {
			Api.openSharePopup(data);
		});
	};

	app.exceptionHandler = function(stackTrace) {
		$window.Bugsnag.metaData = {
			lastApiStack: $window.bugsnagAdditionalParams.lastApiStackObject,
			lastClickStack: $window.bugsnagAdditionalParams.lastClickStackObject
		};
		if (stackTrace.split) {
			stackTrace = stackTrace.split('at ').join('\n at ');
		}
		Api.trackError('FlashError: ' + stackTrace);
	};

	app.loadNextChannel = function() {
		swf.loadNextChannel(swf.broadcast);
	};

	app.sendSnapshot = function(image, delayed) {
		if (image.snapshot) {
			image = image.snapshot;
		}

		if (delayed && image) {
			return Api.post('broadcast/uploadThumb', {
				userId: swf.currentSession.userId,
				channelId: swf.currentSession.userId,
				image: image
			});
		} else {
			eventbus.notifySubscribers('swf:snapshot', image);
		}

		if (!swf.snapshot) {
			swf.snapshot = {};
		}

		swf.snapshot.snapshot = image;
	};

	// All possible flash methods

	// isBroadcasting()
	// goLive(options)
	// onLoadChannelChange(options)
	// notifyLogout()
	// socialNetworkPostCallback(swfCallback)
	// setMute(shouldBeMuted)
	// onPusherEvent(pusherEvent, pusherData)
	// endBroadcast()
	// cancelBroadcast()
	// cameraSetup()

	var readyStateEvents = ['onPusherEvent', 'goLive', 'setMute'];
	var queue = {
		init: {},
		ready: {}
	};

	//Tag Queue variables
	var randomQueuePercentage,
		nextQueuePosition = false,
		resolveQueue = function(type) {
			angular.forEach(queue[type], function(params, method) {
				swf.invokeSwfMethod(method, params);
			});
			queue[type] = {};
		},
		loadFeaturedBroadcast = function() {
			Api.get('younow/featured', {
					locale: config.UILocale
				})
				.then(function(response) {
					if (response.data.state === 'onBroadcastPlay') {
						app.loadChannel({
							channelId: response.data.userId
						});
					} else if (response.data.state === undefined) {
						return false;
					} else {
						swf.loadNextChannel(response.data);
					}
				});
		};

	var fanMailGif = 'yn_anim_fanmail_132x132.gif',
		fanMailReset = 'yn_anim_fanmail_132x132.png',
		chattersReference = [],
		friendsViewing = [];

	swf.available = function() {
		swf.object = document.getElementById('flashObj1');
		if (!swf.object) {
			swf.init = false;
			swf.ready = false;
			return false;
		} else {
			return true;
		}
	};

	swf.invokeSwfMethod = function(method, params) {
		if (config.mcu == "1" && (method == 'goLive' || method == 'endBroadcast' || method == 'cancelBroadcast')) {
			return false;
		}

		if (method === 'cancelBroadcast') {
			$rootScope.gaEvent('Go Live', 'Broadcast cancelled', config.UILocale, new Date().getTime() - bcSetupTime.goLive);
		}

		// Figure out the type of event
		var readyType = readyStateEvents.indexOf(method) === -1 ? 'init' : 'ready';
		// If the SWF is not ready or not available, queue the call
		if (!swf[readyType] || !swf.available()) {
			queue[readyType][method] = params;
		} else {
			params = typeof params !== 'string' ? JSON.stringify(params) : params;
			try {
				if (swf.object[method]) {
					if (params || params === false) {
						return swf.object[method](params);
					} else {
						return swf.object[method]();
					}
				}
			} catch (err) {
				console.warn(method, params, err);
			}
		}

	};

	swf.onPusherEvent = function(pusherEvent, pusherData) {
		debug.console(['SWF', 'PUSHER', pusherEvent], {
			pusherEvent: pusherEvent,
			pusherData: pusherData
		});

		var data = (pusherData && pusherData.message) ? pusherData.message : null;
		if (swf.settingUpBroadcast) {
			return false;
		}
		if (pusherEvent === 'onViewers' && data) {
			dashboard.syncCurrentViewers(data);
			swf.broadcast.viewers = Api.squashedNumber(data.viewers, 4);
		}
		if (pusherEvent === 'onLikes' || pusherEvent === 'onViewers' && data) {
			swf.broadcast.likes = Api.squashedNumber(data.likes, 5);
			swf.broadcast.likePercent = data.likePercent;
		}

		if (pusherEvent === 'onBroadcastPlayData' && data) {
			if (data.channelId != swf.broadcast.userId) {
				return false;
			}

			swf.broadcast.subscribersCount = data.subscribersCount;
			if (data.chatMode == 1 && data.chatMode != swf.broadcast.chatMode) {
				Api.showTopNotification('Subscriber-only chat mode activated', 'success');
			}
			swf.broadcast.chatMode = data.chatMode;

			$timeout.cancel(swf.broadcast.quality_timeout);
			swf.broadcast.quality = data.quality;
			swf.broadcast.quality_timeout = $timeout(function() {
				swf.broadcast.quality = {
					percentage: 0,
					desc: 'low'
				};
			}, 15000);
			//remove EOB screen if there is one
			if (swf.eob && data.channelId != swf.currentSession.userId) {
				delete swf.eob;
			}

			//need to sync up the time incase that it's lagging behind or too fast
			if (data.length && swf.broadcast && swf.broadcast.length !== data.length) {
				swf.broadcast.length = data.length;
			}

			if (swf.broadcast && !swf.broadcast.media && data.media) {
				swf.broadcast.media = data.media;
				swf.invokeSwfMethod('changeChannel', swf.broadcast);
				swf.loadingBroadcasterState = false;
				swf.playState = 'PLAYING';
			}
			//sync data
			if (data.shares && (data.shares >= swf.broadcast.shares)) {
				swf.broadcast.shares = data.shares;
			}
			swf.stickersMultiplier = data.stickersMultiplier;
			// default price
			swf.dynamicPricedGoodies = data.dynamicPricedGoodies;
			// group price
			if (swf.currentSession && swf.currentSession.dynamicPriceGroup) {
				for (var SKU in swf.dynamicPricedGoodies) {
					if (data.dynamicPricedGoodiesGroups[SKU] && data.dynamicPricedGoodiesGroups[SKU][swf.currentSession.dynamicPriceGroup]) {
						swf.dynamicPricedGoodies[SKU] = data.dynamicPricedGoodiesGroups[SKU][swf.currentSession.dynamicPriceGroup];
					}
				}
			}
			// Start time for broadcaster.
			if (data.length && swf.broadcast.length === 0) {
				swf.broadcast.length = data.length;
			}
			// Re-sync via pusher.
			if (Math.abs(data.length - swf.broadcast.length) > 10) {
				swf.broadcast.length = data.length;
			}
			// chat input
			if (chatService.chatInputPlaceholder) {
				chatService.chatInputPlaceholder();
			}
		}
		if (pusherEvent === 'onBroadcastDisconnect' && swf.broadcast.userId == swf.currentSession.userId && data) {
			swf.invokeSwfMethod('startBroadcast', data.media);
		}

		if ((pusherEvent === 'onBroadcastEndHost' || pusherEvent === 'onBroadcastEnd' || pusherEvent === 'onBroadcastCancel') && data) {
			//clean up the broadcast data
			if (dashboard.users) {
				dashboard.filterTrending(swf.broadcast.userId);
			}
			swf.resetBroadcast(false, false, true);
			swf.loadChannel = {
				isBroadcasting: false
			};
			//format and capture for the eob screen
			if (data.eob && swf.loadingBroadcasterState !== 'PREV') { // && swf.broadcast.userId == swf.currentSession.userId
				if (!swf.eob && !swf.settingUpBroadcast) {
					swf.eob = data.eob;
					swf.eob.duration = $filter('date')(swf.broadcast.length * 1000, 'mm:ss');
					swf.eob.userId = swf.broadcast.userId;
					if (swf.broadcast.length >= 3600) {
						swf.eob.duration = Math.floor(swf.broadcast.length / 3600) + ":" + swf.eob.duration;
					}
					if (swf.eob.gifts.length > 0) {
						swf.eob.giftsTotal = JSON.parse(swf.eob.gifts).length;
					}
					if (swf.eob.endLevel > 0) {
						swf.eob.progress = angular.copy((Math.floor(100 * swf.eob.endLevel) / 100).toFixed(2));
					} else {
						swf.eob.progress = angular.copy((Math.floor(100 * swf.eob.startLevel) / 100).toFixed(2));
					}
					swf.eob.progress = (swf.eob.progress + "").split('.')[1];
					swf.eob.nextLevel = swf.eob.endLevel ? Math.floor(angular.copy(swf.eob.endLevel)) + 1 : Math.floor(angular.copy(swf.eob.startLevel)) + 1;
					swf.eob.startLevel = Number(swf.eob.startLevel.toFixed(2));
					swf.eob.endLevel = Number(swf.eob.endLevel.toFixed(2)) - swf.eob.startLevel;
					swf.eob.progress = swf.eob.progress[0] === '0' ? swf.eob.progress[1] : swf.eob.progress;
					if (swf.broadcast.userId == swf.currentSession.userId)
					{
						eventbus.notifySubscribers('user:update', {
							'progress': Number(swf.eob.progress),
							'level': swf.eob.nextLevel - 1
						});
					}
					$state.go("main.channel.detail.endOfBroadcast");
				}
			}
			/*
			if (swf.loadingBroadcasterState !== 'PREV' && swf.broadcast.userId != swf.currentSession.userId) 
			{
				swf.loadNextChannel(data);
			}*/
			swf.isBroadcasting = false;
			swf.invokeSwfMethod('endBroadcast');
			swf.isBroadcasting = false;
			return false;
		}

		if (pusherEvent === 'onChat' && data && data.comments !== null && swf.activeChatTab == 'Chat') {
			var comments = [];

			if (!swf.broadcast.comments) {
				swf.broadcast.comments = [];
			}
			for (var i = 0; i < data.comments.length; i++) {
				//filter chat based on user locales
				if (data.comments[i].loc && config.UILocale !== data.comments[i].loc && config.UILocale !== 'ww') {
					return false;
				}

				//convert the comment linkify text | Convert Emoji chars | Find Hashes
				// we want our own messages to show up because we want to know if there is a bad word! :)
				//if (swf.currentSession && data.comments[i].userId !== Number(swf.currentSession.userId)) {
					//strip html from comments
					var found = false;
					if (swf.currentSession && data.comments[i].userId == Number(swf.currentSession.userId))
					{
						for (var x = 0; x < swf.broadcast.comments.length; x++)
						{
							if (swf.broadcast.comments[x].own == true && swf.broadcast.comments[x].comment == data.comments[i].comment)
							{
								found = true;
								swf.broadcast.comments[x].sent = true;
								console.log("A");
							}
						}
					}
					if (!found)
					{
						data.comments[i].comment = Api.stripHTML(data.comments[i].comment);
						//check for a mention
						data.comments[i] = checkForMention(data.comments[i]);
						//format the comment in the form of html
						data.comments[i].hashedComment = Api.replaceHash(Api.convertEmoji(Api.linkify(data.comments[i].comment)));
						data.comments[i].userLevelFloor = Math.floor(data.comments[i].userLevel);
						data.comments[i].giftId = false;
						data.comments[i].isBroadcaster = swf.broadcast.userId == data.comments[i].userId ? true : false;
						if (data.comments[i].sf) {
							data.comments[i].sf = config.settings.SelfieBaseUrl + data.comments[i].sf;
						}
						comments.push(data.comments[i]);
						addChatter(data.comments[i]);
					}
				//}
				
			}
			swf.broadcast.comments = swf.broadcast.comments.concat(comments);
		}

		if (pusherEvent === 'onFanMailRequest' && data) {
			data.isShowing = true;
			if (!swf.fanMailRequestQueue) {
				swf.fanMailRequestQueue = [];
			}

			// SORT by value/time
			// first property must have key "0", and must always stay the same, until removed
			var first = false;
			for (var num in swf.fanMailRequestQueue) {
				first = swf.fanMailRequestQueue[num];
				break;
			}
			if (first) { // if array exists
				swf.fanMailRequestQueue[0] = first; // so added item never gets put before first item
				swf.fanMailRequestQueue[999999999 - ((data.value * 10000) - data.goodieTransactionId)] = data; // price takes priority, followed by time, reversed
			} else {
				swf.fanMailRequestQueue[0] = data; // first
			}
		}

		if (pusherEvent === 'onGift' && data) {
			var gifts = [];
			for (var a = 0; a < data.gifts.length; a++) {
				if (data.gifts[a] && (data.gifts[a].userId !== Number(swf.currentSession.userId) || data.gifts[a].mode == 2)) {
					data.gifts[a].userLevelFloor = Math.floor(data.gifts[a].userLevel);
					if (data.gifts[a].sf) {
						data.gifts[a].sf = config.settings.SelfieBaseUrl + data.gifts[a].sf;
					}
					if (data.gifts[a].mode == 2) {
						swf.giftOverlayQueue.push(data.gifts[a]);
						if (playerOverlayService.onGift) {
							playerOverlayService.onGift();
						}
					} else if (data.gifts[a].mode == 3 && swf.currentSession.userId != swf.broadcast.userId) {
						addToFanMailQueue(data.gifts[a]);
					} else if (data.gifts[a].mode == 3) {
						return false;
					} else {
						data.gifts[a] = checkForMention(data.gifts[a]);
						addChatter(data.gifts[a]);
						gifts.push(data.gifts[a]);
					}
				}
			}
			swf.broadcast.comments = swf.broadcast.comments.concat(gifts);
		}

		if ((pusherEvent === 'onSystemMessage' || pusherEvent === 'onFanMailReject') && (pusherEvent !== 'onBan' && pusherEvent !== 'onSuspend') && data) {
			//format a rejection notice to look like a system message
			if (pusherEvent === 'onFanMailReject') {
				data.web = data.copy;
				data.webTime = 10;

				//refund the user
				if (data.vault && data.vault.webBars) {
					swf.barsRefund = data.vault.webBars;
				}
			}
			if (data.web) {
				swf.systemMessagesQueue.push(data);
				if (playerOverlayService.onSystemMessage) {
					playerOverlayService.onSystemMessage();
				}
			}
		}

		if (pusherEvent === 'onTopFanChange' && data) {
			checkIfTopFan(data.tfl);
			swf.broadcast.tfl = prepareTopFans(data.tfl);
		}

		if (pusherEvent === 'onP2PFanJoinedBroadcast' && data) {
			commentFriendsWhoJoined(data);
		}
	};

	var checkIfTopFan = function(fans) {
		swf.isTopFan = false;
		if (swf.currentSession && swf.currentSession.userId) {
			for (var i = 0; i < fans.length; i++) {
				if (fans[i].uId == swf.currentSession.userId) {
					swf.isTopFan = true;
				}
			}
		}
	};

	var prepareTopFans = function(fans) {
		for (var i = 0; i < fans.length; i++) {
			fans[i].b = Api.squashedNumber(fans[i].b, 9);
		}
		return fans;
	};

	swf.currentLowLevel = 0;
	
	swf.lowLevel = function(level) {
		var action = 128;
		if (level == 5)
			action = 268435456;
		else if (level == 10)
			action = 2147483648;
		var apiParams = {
			actionId: action,
			userId: swf.currentSession.userId,
			onUserId: swf.broadcast.userId
		};

		var apiData = {
			url: 'php/api/doAdminAction',
			method: 'post',
			data: apiParams
		};
		swf.currentLowLevel = level;
		upload(apiData).then(function(response) {
			handleAdminActionResponse(response);
		});
	};
	
	swf.newBroadcaster = function(broadcaster, goingLive) {
		swf.currentLowLevel = 0;
		debug.console(['SWF', 'BROADCAST'], 'New Broadcaster ' + broadcaster.broadcastId);
		//temporary solution for selfies switch until we remove
		if (broadcaster.disableSelfie === undefined) {
			broadcaster.disableSelfie = "1";
		}
		swf.broadcast = broadcaster;

		// Old Player
		if (broadcaster.state !== 'onBroadcastWait' && !swf.settingUpBroadcast) {
			swf.invokeSwfMethod('changeChannel', broadcaster);
		}

		if (broadcaster.state === 'onBroadcastWait') {
			swf.broadcast.state = 'onBroadcastPlay';
		}

		if (swf.currentSession && broadcaster.user.userId === swf.currentSession.userId) {
			$rootScope.gaEvent('Go Live', 'Broadcast Start', config.UILocale, new Date().getTime() - bcSetupTime.goLive);
		} else {
			swf.loadingBroadcasterState = 'WAITING';
			swf.playState = 'BUFFERING';
		}

		// New Player
		swf.activeChatTab = 'Chat';
		swf.broadcast.viewers = Api.squashedNumber(swf.broadcast.viewers, 4);
		swf.broadcast.likes = Api.squashedNumber(swf.broadcast.likes, 5);

		swf.broadcast.tfl = prepareTopFans(swf.broadcast.tfl);
		checkIfTopFan(swf.broadcast.tfl);
		swf.audienceLists = {};
		swf.giftOverlayQueue = [];
		swf.systemMessagesQueue = [];
		swf.fanMailQueue = [];
		swf.audienceLists.prevLoadedPage = 0;
		swf.settingUpBroadcast = false;
		swf.broadcast.shareCount = {};

		//this code should be changed when the chat service is deployed by Paul
		swf.broadcast.chatters = null;
		chattersReference = null;
		swf.broadcast.chatters = [];
		chattersReference = [];

		for (var i = 0; i < swf.broadcast.comments.length; i++) {
			swf.broadcast.comments[i].comment = Api.stripHTML(swf.broadcast.comments[i].comment);
			swf.broadcast.comments[i] = checkForMention(swf.broadcast.comments[i]);
			swf.broadcast.comments[i].hashedComment = Api.replaceHash(Api.convertEmoji(Api.linkify(swf.broadcast.comments[i].comment)));
			swf.broadcast.comments[i].userLevelFloor = Math.floor(swf.broadcast.comments[i].userLevel);
			swf.broadcast.comments[i].giftId = false;
			if (swf.broadcast.comments[i].sf) {
				swf.broadcast.comments[i].sf = config.settings.SelfieBaseUrl + swf.broadcast.comments[i].sf;
			}
			addChatter(swf.broadcast.comments[i]);
		}
		commentFriendsWhoJoined(friendsViewing);

		if (!goingLive) {
			eventbus.notifySubscribers('swf:reset');
		} else {
			swf.goLive();
			swf.invokeSwfMethod('goLive');
		}
	};

	// Queue system messages
	swf.systemMessagesQueue = [];

	swf.notifyLogin = function(sessionData) {
		//check if user logged in is a top fan
		if (swf.broadcast && swf.broadcast.tfl) {
			checkIfTopFan(swf.broadcast.tfl);
		}
	};

	swf.notifyLogout = function() {
		swf.loggedIn = false;
		swf.currentSession = undefined;
		swf.invokeSwfMethod('notifyLogout');
		eventbus.notifySubscribers('swf:reset');
	};

	swf.sendKeepSession = function(sessionData) {
		swf.currentSession = sessionData;
	};

	swf.goLive = function() {
		swf.currentLowLevel = 0;
		bcSetupTime.goLive = new Date().getTime();
		$rootScope.gaEvent('Go Live', 'Broadcast Init', config.UILocale);
		swf.resetBroadcast(true);
		eventbus.notifySubscribers('swf:reset');
		swf.bootingFlash = false;
		if (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1) {
			$modal.alert('Please Note: Safari is not currently fully compatible with YouNow broadcasting. </br> We highly recommend you broadcast from <a href="https://www.google.com/chrome/browser/" target="_blank">Chrome</a> or <a href="https://www.mozilla.org/en-US/firefox/new/" target="_blank">Firefox</a>.');
		}
	};

	swf.getSnapshot = function() {
		swf.invokeSwfMethod('getSnapshot', false);
		swf.activeChatTab = 'Snapshot';

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
			'broadcast': swf.broadcast
		});
	};

	swf.setVolume = function(volume, save) {
		swf.volume = volume;
		swf.invokeSwfMethod('setVolume', swf.volume);
		Api.store('younowVol', swf.volume);
	};

	swf.toggleMute = function() {
		swf.setVolume(swf.volume === 0 ? 100 : 0, true);
		swf.setMiniPlayerVolume();
	};

	swf.setMiniPlayerVolume = function() {
		if (jwplayer('playeroniBsrErLcZk') && jwplayer('playeroniBsrErLcZk').setVolume) {
			jwplayer('playeroniBsrErLcZk').setVolume(swf.volume);
		}
	};

	swf.setGain = function(gain) {
		swf.gain = gain;
		swf.invokeSwfMethod('setGain', swf.gain);
	};

	swf.Comment = function(comment, name, userId, userLevel, role, giftId, quantity, subscriptionType, isP2pComment, selfie) {
		this.comment = comment;
		this.name = name;
		this.role = role;
		this.userLevelFloor = Math.floor(userLevel);
		this.userLevel = userLevel;
		this.userId = userId;
		this.giftId = giftId;
		this.subscriptionType = subscriptionType;
		this.quantity = quantity;
		this.isBroadcaster = swf.broadcast.userId == userId ? true : false;
		this.p2pComment = isP2pComment;
		this.sf = selfie;
	};

	swf.postChatComment = function(newComment, userId, channelId) {
		return Api.post('broadcast/chat', {
			userId: userId,
			channelId: channelId,
			comment: newComment
		});
	};

	swf.postGift = function(userId, channelId, giftId, quantity, Filedata, targetNetwork) {
		var giftParams = {
			userId: userId,
			channelId: channelId,
			giftId: giftId,
			quantity: quantity
		};

		if (Filedata !== undefined && targetNetwork !== undefined) {
			giftParams.Filedata = Filedata;
			giftParams.targetNetwork = targetNetwork;
		}

		return Api.post('broadcast/gift', giftParams);
	};

	//used for scrolling (as well as refreshing)
	swf.getAudience = function(startPage, numOfRecords, isRefresh) {
		var userId = swf.currentSession === undefined ? 0 : swf.currentSession.userId,
			params,
			useCDN = true;

		if (swf.broadcast.userId === userId) {
			params = {
				broadcaster: 1,
				channelId: swf.broadcast.userId,
				numOfRecords: numOfRecords,
				start: startPage,
				userId: userId
			};
			useCDN = false;
		} else {
			params = {
				channelId: swf.broadcast.userId,
				numOfRecords: numOfRecords,
				start: startPage
			};
		}

		swf.audienceLists.prevLoadedPage = startPage;

		Api.get('broadcast/audience', params, useCDN)
			.then(function(response) {
				if (response.data.errorCode === 0) {

					//If no pages exist
					if (!swf.audienceLists.pages) {
						swf.audienceLists.pages = [];
						swf.audienceLists.currentDate = new Date();
						swf.audienceLists.currentPage = 0;
					}
					// extra data for all viewers
					for (var x = 0; x < response.data.audience.length; x++) {
						// same as fanDate
						response.data.audience[x].subscriptionDate = response.data.audience[x].subscriptionDate.split('-');
						if (response.data.audience[x].subscriptionDate.length > 1) {
							response.data.audience[x].subscriptionDateUNIX = new Date(response.data.audience[x].subscriptionDate[0], response.data.audience[x].subscriptionDate[1] - 1, response.data.audience[x].subscriptionDate[2]).getTime();
						}
					}
					// extra data for broadcaster
					if (swf.broadcast.userId === userId) {
						//format dates and birthdate
						for (var i = 0; i < response.data.audience.length; i++) {
							response.data.audience[i].fanDate = response.data.audience[i].fanDate.split('-');
							response.data.audience[i].fanDateUNIX = new Date(response.data.audience[i].fanDate[0], response.data.audience[i].fanDate[1] - 1, response.data.audience[i].fanDate[2]).getTime();
							var currentBirthday = response.data.audience[i].birthday.split('-');
							response.data.audience[i].birthdayJSO = new Date(swf.audienceLists.currentDate.getFullYear(), currentBirthday[1] - 1, currentBirthday[2]);
							response.data.audience[i].daysUntilBirthday = Math.ceil(Math.abs(swf.audienceLists.currentDate.getTime() - response.data.audience[i].birthdayJSO.getTime()) / (1000 * 3600 * 24));

							if (response.data.audience[i].birthdayJSO.getMonth() === swf.audienceLists.currentDate.getMonth()) {
								if (response.data.audience[i].daysUntilBirthday === 1) {
									response.data.audience[i].birthdayCopy = 'Birthday today!';
								}
								if (response.data.audience[i].daysUntilBirthday > 1 && response.data.audience[i].daysUntilBirthday < 8) {
									response.data.audience[i].birthdayCopy = 'Birthday this week!';
								}
								if (response.data.audience[i].daysUntilBirthday >= 8 && response.data.audience[i].daysUntilBirthday < 31) {
									response.data.audience[i].birthdayCopy = 'Birthday this month!';
								}
							} else {
								response.data.audience[i].daysUntilBirthday = 0;
							}
						}
					}
					//first time
					if (swf.audienceLists.pages.length === 0 && swf.audienceLists.timer === undefined) {
						swf.audienceLists.pages.push(response.data);
						startAudienceRefresh(swf.audienceLists.nextRefresh);
						swf.audienceLists.currentPage = 0;
					}
					//refresh current page
					else if (isRefresh === true) {
						swf.audienceLists.pages[startPage] = response.data;
						swf.audienceLists.timer = 0;
					}
					//lazy load
					else {
						response.data.scrollRefreshCooldown = 0;
						swf.audienceLists.pages.push(response.data);
					}
					swf.audienceLists.hasNext = response.data.hasNext;
					swf.audienceLists.nextRefresh = response.data.nextRefresh || 30;
				}
			});
	};

	//check the size of the queue and call again depending on size or cancel if none in queue
	$interval(function() {
		if (!swf.fanMailTimer && swf.fanMailQueue) {
			if (swf.fanMailQueue.length === 1) {
				swf.fanMailDisplay(swf.giftObjects.FANMAIL.maxVis);
			} else if (swf.fanMailQueue.length > 1) {
				swf.fanMailDisplay(swf.giftObjects.FANMAIL.minVis);
			}
		}

	}, 1000);

	swf.fanMailDisplay = function(time) {
		swf.fanMailTimer = $timeout(function() {
			if (swf.fanMailQueue.length > 0) {
				swf.fanMailQueue[0].isShowing = false;
			}
		}, time - 1000).then(function(response) {
			$timeout(function() {
				swf.fanMailTimer = false;
				swf.fanMailQueue.splice(0, 1);
			}, 1000);
		});
	};

	swf.resetBroadcast = function(settingUp, cancelled, EOB) {
		//reset the player state (chat, fanmail, top fans)
		swf.fanMailRequestQueue = [];
		swf.systemMessagesQueue = [];
		swf.giftOverlayQueue = [];
		swf.fanMailQueue = [];
		swf.activeChatTab = 'Chat';
		swf.settingUpBroadcast = settingUp;
		swf.loadingBroadcasterState = false;
		swf.snapshot = undefined;

		//hide the EOB screen
		if (!EOB && swf.eob !== undefined) {
			swf.eob.visible = false;
		}

		if (swf.broadcast && cancelled) {
			swf.oldTfl = swf.broadcast.tfl;
			swf.oldTfl = [];
			return false;
		}

		if (swf.broadcast) {
			swf.broadcast.tfl = [];
			swf.broadcast.comments = [];
			swf.broadcast.shares = 0;
			swf.broadcast.likes = 0;
			swf.broadcast.viewers = 0;
		}
	};

	swf.loadNextChannel = function(data) {
		swf.loadingBroadcasterState = 'PREV';
		debug.console(['SWF', 'BROADCAST'], 'load next broadcast');

		var queueDist = config.settings.BroadcastEndQueueDistribution;
		if (typeof queueDist == 'number') {
			queueDist = [queueDist];
		}

		//remove old broadcaster from queue
		if (swf.queue && swf.queue.length > 0) {
			for (var b = 0; b < swf.queue.length; b++) {
				if (swf.queue[b].broadcastId == data.broadcastId) {
					swf.queue.splice(b, 1);
				}
			}
		}

		//if its the last broadcaster in that queue go to the featured broadcaster
		if (!swf.queue || (swf.queue && swf.queue.length === 0)) {
			loadFeaturedBroadcast();
			return false;
		}

		//check if is not a contestTag if so choose the first tag
		if (swf.broadcast.contestTag) {
			app.loadChannel({
				channelId: swf.queue[0].userId
			});
			return false;
		}

		randomQueuePercentage = Math.floor(Math.random() * 99 + 1);
		if (queueDist.length > 0) {
			for (var c = 0; c < queueDist.length; c++) {
				if (randomQueuePercentage >= Number(queueDist[c]) && nextQueuePosition === false) {
					nextQueuePosition = c;
				}

				if (c === queueDist.length && nextQueuePosition === false) {
					nextQueuePosition = c;
				}
			}
		} else {
			nextQueuePosition = 0;
		}

		if (swf.queue[nextQueuePosition] === undefined) {
			nextQueuePosition = 0;
		}
		if (swf.queue[nextQueuePosition] && swf.queue[nextQueuePosition].userId) {
			//switch the channel to that channel if it's healthy, otherwise look again
			Api.get('broadcast/info', {
					channelId: swf.queue[nextQueuePosition].userId,
					curId: swf.broadcast.userId | 0
				})
				.then(function(response) {
					response.data = swf.channelFormat(response.data);

					if (response.data.state === 'onBroadcastPlay') {
						app.loadChannel({
							channelId: swf.queue[nextQueuePosition].userId
						});
						nextQueuePosition = false;
					} else {
						swf.loadNextChannel(response.data);
						nextQueuePosition = false;
					}
				});
		} else {
			//if the channel doesn't exist load a featured BC if it's healthy
			loadFeaturedBroadcast();
		}
	};

	swf.getShareData = function(source, entityId, isSnapshot, goingLive) {
		// Setup promise
		var defer = $q.defer();
		var broadcaster = entityId && !isSnapshot ? swf.currentSession : swf.broadcast.user;
		var data = {
			entityType: isSnapshot ? 's' : 'b',
			entityId: entityId ? entityId : swf.broadcast.broadcastId,
			entityUserId: broadcaster.userId,
			userId: (swf.currentSession ? swf.currentSession.userId : 0),
			feature: isSnapshot ? 'SNAPSHOT' : 'PROMOTE',
			source: source.toUpperCase()
		};
		// Do synchronous for now
		data.profileUrlString = entityId ? swf.currentSession.profile : swf.broadcast.profile;
		data.inviteStr = swf.broadcast.userId;
		var sourcePrefix = goingLive ? 102 : isSnapshot ? 105 : 103;
		data.srcId = data.source == 'FACEBOOK' ? sourcePrefix + "2" : sourcePrefix + "1";
		data.url = Api.buildShareUrl(data);
		// Add on more share data
		if (swf.currentSession && swf.currentSession.userId === data.entityUserId) {
			data.broadcaster = 1;
		}
		if (data.source == 'FACEBOOK' || data.source == 'TWITTER') {
			data.name = data.source == 'TWITTER' && broadcaster.twitterHandle ? '@' + broadcaster.twitterHandle : swf.broadcast.user.firstName;
			data.copy = Api.buildShareCopy(data);
		}
		defer.resolve(data);
		return defer.promise;
	};

	swf.snapshotLinks = function(params) {
		var defer = $q.defer();
		if (!params.broadcast) {
			console.error('specify broadcast for younow/referralCode');
			return false;
		}
		Api.get('younow/referralCode', {
				userId: swf.currentSession.userId,
				entityId: params.broadcast.broadcastId,
				entityType: 'b',
				entityUserId: params.broadcast.userId,
				source: 'FACEBOOK,TWITTER,COPIEDURL',
				feature: (params.guesting ? 'GUEST' : 'SNAPSHOT')
			})
			.then(function(response) {
				if (!swf.snapshot) {
					swf.snapshot = {};
				}
				if (!response.data.errorCode) {
					swf.snapshot.links = response.data;
					defer.resolve(response.data);
				} else {
					console.error('younow/referralCode failed:', response);
					defer.reject(response.data);
				}
			});
		return defer.promise;
	};

	swf.storeFriendsViewing = function(friends) {
		if (friends) {
			if (!friendsViewing) {
				friendsViewing = friends;
				commentFriendsWhoJoined(friendsViewing);
			} else {
				friendsViewing = friends;
			}
		}
	};

	function commentFriendsWhoJoined(friends) {
		var i = 0;
		for (i; i < friends.length; i++) {
			if ((friends[i].status === 0 || !friends[i].status) && swf.broadcast && friends[i].channelId == swf.broadcast.userId) {
				var comment = new swf.Comment('is here', (friends[i].profile || friends[i].name), friends[i].userId, undefined, 0, undefined, undefined, 0, true);
				comment.hashedComment = Api.trustedHTML('is here');
				swf.broadcast.comments.push(comment);
				addChatter(comment);
				eventbus.notifySubscribers('trackingPixel:capture', {
					'event': 'FRIEND_PRESENT',
					'field1': friends[i].userId.toString()
				});
			}
		}
	}

	function addChatter(comment) {
		var referenceSize = Object.keys(swf.broadcast.chatters).length;
		if (referenceSize > 100) {
			swf.broadcast.chatters = swf.broadcast.chatters.splice(swf.broadcast.chatters.length - 50, 50);
			chattersReference.splice(chattersReference.length - 50, 50);
		}
		if (chattersReference.indexOf(Number(comment.userId)) === -1 && comment.name !== 'Younow') {
			swf.broadcast.chatters.push({
				'displayName': comment.name,
				'thumb': config.settings.ServerCDNBaseUrl + '/php/api/channel/getImage/channelId=' + (comment.userId || 0)
			});
			chattersReference.push(Number(comment.userId));
		}
		//add the broadcaster even if they haven't chatted
		if (chattersReference.indexOf(Number(swf.broadcast.userId)) === -1) {
			swf.broadcast.chatters.push({
				'displayName': swf.broadcast.profile,
				'thumb': config.settings.ServerCDNBaseUrl + '/php/api/channel/getImage/channelId=' + (swf.broadcast.userId || 0)
			});
			chattersReference.push(Number(swf.broadcast.userId));
		}
	}

	function checkForMention(comment) {
		if (swf.currentSession) {
			var atMentionProfile = '@' + swf.currentSession.profile;
			var atMentionFullName;
			if (swf.currentSession.fullName) {
				var lastSpaceIndex = swf.currentSession.fullName.indexOf(" ");
				atMentionFullName = '@' + swf.currentSession.fullName.substring(0, lastSpaceIndex + 2) + '.';
			}

			//direct mention
			if (comment.comment.indexOf(atMentionProfile) !== -1 || (atMentionFullName && comment.comment.indexOf(atMentionFullName) !== -1)) {
				comment.mention = true;
				//your directly mentioned
				eventbus.notifySubscribers('trackingPixel:capture', {
					'event': 'AT_MENTIONED',
					'field1': comment.userId.toString()
				});
			}
			//someone you're a fan of
			else if (swf.currentSession.p2pList && swf.currentSession.p2pList[comment.userId]) {
				comment.isFriend = true;
			}
			//no relationship
			else {
				comment.mention = false;
			}
		}
		return comment;
	}

	function addToFanMailQueue(gift) {
		gift.isShowing = true;
		swf.fanMailQueue.push(gift);
	}

	function startAudienceRefresh(time) {
		if (swf.refresh) {
			$interval.cancel(swf.refresh);
			swf.refresh = undefined;
		}

		if (!swf.refresh) {
			swf.refresh = $interval(function() {
				if (swf.activeChatTab === 'Audience') {
					if (!swf.audienceLists.timer) {
						swf.audienceLists.timer = 0;
					}
					if (swf.audienceLists.currentPage === 0) {
						swf.audienceLists.timer++;
					}
					if (swf.audienceLists.timer === swf.audienceLists.nextRefresh) {
						swf.getAudience(swf.audienceLists.currentPage, 20, true);
						swf.audienceLists.timer = 0;
					}
				}
			}, 1000);
		}
	}

	return swf;

}])

;
