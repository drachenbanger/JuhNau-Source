angular.module('younow.services.session', [
	'younow.modals.login',
	'younow.services.session.facebook',
	'younow.services.session.google',
	'younow.services.session.twitter',
	'younow.services.session.instagram',
	'younow.services.session.youtube',
	'younow.services.session.tumblr'
])

.factory('session', function($rootScope, $location, $q, $timeout, $modal, $window, $state, $translate, config, swf, pusher, Api, Facebook, twitter, google, instagram, youtube, tumblr, eventbus, guestService, trpx, selfies, webRtc) {

	var session = {};

	// Setup
	session.fanStatus = {};
	session.subStatus = {};
	session.isFanQueue = [];
	session.isSubQueue = [];
	session.authenticate = {
		facebook: Facebook.authenticate,
		twitter: twitter.authenticate,
		google: google.authenticate,
		instagram: instagram.authenticate,
		youtube: youtube.authenticate,
		tumblr: tumblr.authenticate
	};

	function rerouteNonPartners(user) {
		//reroute if not partners
		if (user.userId === 0 || (user.userId > 0 && user.partner === 0 && $state.current.name === '/partners/earnings')) {
			$state.go('/partners');
		}
		//non partner states route them back to the main channel
		if (user.userId !== 0 && (user.partner == 4 || user.partner == 5 || user.partner == 8 || user.partner == 9 || user.partner == 10)) {
			$state.go('main.channel.detail');
		}
	}

	function getP2pList(channelId) {
		Api.get('younow/p2plist', {
			channelId: channelId
		}).then(function(response) {
			var i = 0,
				p2pMap = {};
			for (i; i < response.data.users.length; i++) {
				p2pMap[response.data.users[i].userId] = response.data.users[i].name;
			}
			swf.currentSession.p2pList = p2pMap;
		});
	}

	//check if payable user
	function payeePayable() {
		var getRequest = Api.get('store/payeePayable?userId=' + session.user.userId);
		return getRequest.then(function(response) {
			if (response.data && response.data.result) {
				//if user already being paid by tipalti, or if user is already paid by an MCN
				if (response.data.result.b === true) {
					return true;
				} else {
					return false;
				}
			}
		});
	}


	session.showLoginModal = function(hard, source) {
		return $modal.loginModal(hard, source);
	};

	session.auth = function(type, silent) {
		// login
		return session.authenticate[type](silent).then(function(data) {
				Api.store('lastNetwork', type);
				return session.login(data);
			})
			.catch(function(response) {
				if (response === 'error') {
					Api.showTopNotification('Could not login. Please try again!');
				}
				Api.store('lastNetwork', null);
			});
	};

	session.getSession = function() {
		if (window.isPrerender) {
			return false;
		}

		var post = {
			curId: session.curId || 0,
			app_version: config.settings.JS_VERSION,
			model: Api.pad(window.screen.width, 4) + 'x' + Api.pad(window.screen.height, 4),
			UILanguage: Api.store('UILanguage')
		};

		if (Api.store('oneSignalId')) {
			post.deviceChannel = Api.store('oneSignalId');
		}

		post.browser = Api.browser.name;
		post.browser_version = Api.browser.major;
		post.device_version = Api.os.version;
		post.device_os = Api.os.name;

		window.YouNow.loadingTime.startYounowUser = Date.now();
		return Api.post('younow/user', post).success(function(data) {
			window.YouNow.loadingTime.younowUser = Date.now() - window.YouNow.loadingTime.startYounowUser;
			if (data.userId == "0") {
				eventbus.unsubscribe('session', 'error:loggedout');
			} else {
				eventbus.subscribe('error:loggedout', session.logout, 'session');
			}
			session.updateUser(data);
			trpx.updateUser(data);
			// Reject if no session found
			if (data.userId === 0) {
				$q.reject();
			}

		});
	};

	session.updateUser = function(data) {
		// page UI language
		// Potentially check for changes and trigger appropriate events
		// Save user data
		session.user = data;
		session.updatePusherShard();
		session.loggedIn = session.user.userId !== 0;
		session.user.fullName = Api.fullName(data);
		session.administrator = session.isAdmin();
		session.moderator = session.isMod();

		if (data.locale) {
			config.setLocale(data.locale);
			trpx.updateLocale(data.locale);
		}

		// Send session data to flash
		swf.sendKeepSession(data);

		// Fetch any relationships that have been queued
		fetchFans();
		fetchSubs();

		// Notify user if banned
		session.checkBan();
		//Show partner state 7 modal if available
		if (session.user.partner === 7) {
			if ($location.$$path != '/partners') {
				$modal.partnerAgreement();
			}
		}

		if (session.loggedIn) {
			// Show notification counts
			session.getNotificationCount();
			// If just logged in, notify flash
			if (!swf.loggedIn) {
				swf.notifyLogin(data);
				swf.loggedIn = true;
			}
			guestService.notifyLogin(data);
			selfies.notifyLogin(data);

			// Connect to private pusher
			pusher.ready().then(function() {
				pusher.subscribeToPrivate(session.user.userId);
			});
			// Respond to partner status
			if (session.user.partner == 6) {
				if ($location.$$path != '/partners' && $location.$$path != '/partner') {
					$modal.partner();
				}
			}
			//in case of editors pick
			if (session.user.editorsPick) {
				if (session.user.editorsPick.state === 1) {
					$modal.epModal();
				}
				if (session.user.editorsPick.state === 3) {
					$modal.epModal('expired');
				}
			}
			//in case of reconnect
			if (session.user.activeBroadcastReconnect && webRtc.supportsWebRtc()) {
				$modal.reconnect();
			}

			//webRTC backend toggle
			if (session.user.mcuEnabled == 1) {
				config.mcu = "1";
			} else {
				config.mcu = undefined;
			}

			// Calculate level progress
			session.user.progress = Math.floor((session.user.realLevel - Math.floor(session.user.realLevel)) * 100);
			// Open the sidebar
			session.showRightSidebar();
			// Set UserId for tracking
			session.trackUser();

			getP2pList(data.userId);

			Api.requestBy = session.user.requestBy;
			//check if payable user only if partner
			if (session.user.partner) {
				payeePayable().then(function(response) {
					session.user.payable = response;
				});
			}

		} else {
			session.rightsidebar = false;
			Api.requestBy = undefined;
		}
		if ($state.current.name === '/partners/earnings') {
			rerouteNonPartners(data);
		}


		// Halograph
		if (window._ht) {
			window._ht._ht_uid = session.user.userId;
		}

		// Broadcast to any listeners
		eventbus.notifySubscribers('session:loggedIn', session.loggedIn);
	};

	session.trackUser = function() {
		if (!session.loggedIn) {
			return false;
		}

		if ($window.ga) {
			$window.ga('set', '&uid', session.user.userId);
			$window.ga('set', 'dimension3', 'registered');
		}
		if ($window.Bugsnag) {
			$window.Bugsnag.user = {
				id: session.user.userId,
				name: session.user.profile
			};
		}
	};


	session.updateLanguage = function(la) {
		if (!la) {
			console.warn('updateLanguage() language not specified');
			return false;
		}
		if (la == 'ww') {
			la = 'en';
		}
		// frontend
		config.UILanguage = la;
		console.log(la);
		$translate.use(config.UILanguage);
		Api.store('UILanguage', config.UILanguage);

		// backend
		var post = {
			UILanguage: la
		};
		if (session.user && session.user.userId) {
			post.channelId = session.user.userId;
			post.userId = session.user.userId;
		}
		Api.post('channel/updateUILanguage', post);
		trpx.updateLanguage(la);
	};


	session.checkBan = function() {
		if (session.user && session.user.userId !== 0 && session.user.banId !== 0) {
			Api.showTopNotification('<div>' + session.user.banningMsg.msgString + '</div>' + '<a class="btn btn-confirm" target="_blank" href="' + session.user.banningMsg.supportBtn.btnAct_web + '">' + session.user.banningMsg.supportBtn.btnTxt_web + '</a>', 'now', true, undefined);
			config.banningMsg = session.user.banningMsg;
			return true;
		}
		return false;
	};

	session.silentAuth = function() {
		if (Api.store('lastNetwork')) {
			return session.auth(Api.store('lastNetwork'), true);
		} else {
			return false;
		}
	};

	session.forceLogin = function(loginType) {
		if (session.loggedIn) {
			return true;
		}
		// Force login if loginGate set to soft or hard
		if (config.settings.loginGate == 'hard' || config.settings.loginGate == 'soft') {
			if ($state.includes('main') && !session.forcedLogin) {
				// Determine if allowed to skip
				// var hard = config.settings.loginGate == 'hard' ? true : false;
				// Show login modal
				// $modal.loginModal(hard, loginType);
				session.forcedLogin = true;
			}
		}
	};

	session.login = function(loginData, connect) {
		// Add extra data
		loginData.locale = config.UILocale;
		loginData.channelId = session.channelId || loginData.channelId;
		loginData.inviteString = session.inviteString || session.channelId;
		loginData.srcId = session.srcId || 0;
		loginData.tmsid = $window.YouNow.Bootstrap.tmId || '';
		loginData.deviceType = Api.browser.name;
		if (Api.store('oneSignalId')) {
			loginData.deviceChannel = Api.store('oneSignalId');
		}

		// Login or connect new service
		var endpoint = connect ? 'younow/connect' : 'younow/login';
		if (connect) {
			loginData.userId = session.user.userId;
		}

		// Post!
		return Api.post(endpoint, loginData).then(function(response) {
			session.loginData = response.data;
			session.getSession();
			return response;
		});

	};

	session.logout = function() {
		if (session.isBroadcasting || swf.settingUpBroadcast || (guestService.guest && guestService.guest.userId == session.user.userId)) {
			session.preventBroadcastInterrupt();
			return false;
		}


		// Send a request to the server
		var post = {
			userId: session.user.userId,
			deviceType: Api.browser.name
		};
		if (Api.store('oneSignalId')) {
			post.deviceChannel = Api.store('oneSignalId');
		}
		Api.post('younow/logout', post).then(function(response) {
			var lastNetwork = Api.store('lastNetwork');
			// ga Track
			if (lastNetwork) {
				$rootScope.gaEvent('FEATURE', 'LOGOUT', lastNetwork.toUpperCase());
			}
			// Update session
			session.getSession().then(function() {
				window.YouNow.Bootstrap.genTmId();
				window.YouNow.Bootstrap.images1();
			});
			// Delete localstorage, so that they aren't automatically logged in
			Api.store('lastNetwork', null);
			// Clear fans/subscriptions (and put back in queue in case of relogin)
			angular.forEach(session.fanStatus, function(status, id) {
				session.fanStatus[id] = undefined;
				session.isFanQueue.push(id);
			});
			// Clear subscribed (and put back in queue in case of relogin)
			angular.forEach(session.subStatus, function(status, id) {
				session.subStatus[id] = undefined;
				session.isSubQueue.push(id);
			});
			//clear useless objects
			session.onlineFriends = null;
			session.onlineFriendIds = null;
			session.p2pList = null;
			// Send logout to services for cleanup
			swf.notifyLogout();
			guestService.notifyLogout();
			selfies.notifyLogout();
		});

	};

	// Unique user ID for connecting to PublicOn Channel
	session.updatePusherShard = function() {
		var newShard = session.user.userId || session.user.session;
		// If changed, update it
		if (newShard != pusher.shard) {
			pusher.shard = newShard;
			// If already subscribed, switch to the new value
			if (pusher.presenceChannel && !config.settings.NoPusherOnChannelWeb) {
				pusher.subscribe('presenceChannel', 'public-on-channel_' + pusher.channelId + '_' + pusher.shard + '_web_' + session.user.sec_token);
			}
		}
	};

	session.showInviteUsers = function(options) {
		if (!$window.FB) {
			throw new Error('Facebook api not found');
		}
		options = options || {};
		var params = {
			method: 'apprequests',
			message: options.msg || 'Hey, you should join YouNow! It\'s a new way to discover awesome people, become a broadcasting legend and get more followers/subscribers.',
			data: {
				src: options.srcId || session.srcId || 0,
				invite: options.inviteStr || session.inviteString || 0
			}
		};
		$rootScope.gaEvent('FEATURE', 'invitefriends', config.UILocale);
		$window.FB.ui(params, options.callback);
	};

	$rootScope.$watch(function() {
		return pusher.onCoins;
	}, function(message) {
		if (message) {
			session.user.userCoins = Number(message.coins) || 0;
			session.user.level = Number(message.level) || 0;
		}
	});

	$rootScope.$watch(function() {
		return swf.partnerState;
	}, function(message) {
		if (message) {
			session.user.partner = message;
		}
	});

	$rootScope.$watch(function() {
		return swf.barsRefund;
	}, function(message) {
		if (message && session.user.userId !== 0) {
			session.user.vault.webBars = message;
		}
	});

	session.getNotificationCount = function() {
		Api.get('younow/notificationCount', {
			userId: session.user.userId
		}).success(function(data) {
			session.resetNotifications();
			session.notificationCount = data.inAppCount || 0;
		});
	};

	$rootScope.$on('onAccountUpdate', function(event, data) {
		$rootScope.$evalAsync(function() {
			event.preventDefault();
			if (session.user.userId) {
				session.user.spendingDisabled = data.message.spendingDisabled;
			}
		});
		session.getSession();
	});

	session.getActivityFeed = function() {
		if (!session.rightsidebar) {
			return true;
		}
		var params = {
			userId: session.user.userId,
			items: 10,
			web: 1
		};

		Api.get('getFeed', params).success(function(data) {
			if (data.feed && data.feed.length) {
				session.activityFeed = data.feed;
			}
			session.noActivity = (!session.activityFeed || session.activityFeed.length === 0);
		});
	};

	session.getOnlineFriends = function() {
		if (!session.rightsidebar) {
			return true;
		}
		var params = {
			numberOfRecords: 50,
			channelId: session.user.userId
		};
		Api.get('channel/getLocationOnlineFansOf', params).success(function(data) {
			if (data.users) {
				session.onlineFriends = Api.sortUsers(data.users);
				var i = 0,
					friendsIds = [];
				for (i; i < session.onlineFriends.length; i++) {
					friendsIds.push(session.onlineFriends[i].userId);
				}
				swf.storeFriendsViewing(session.onlineFriends);
				session.onlineFriendIds = friendsIds;
			}
			session.noFriendsActivity = (!session.onlineFriends || session.onlineFriends.length === 0);
			if (session.loggedIn) {
				Api.poll(session.getOnlineFriends, 'getOnlineFriends', data.nextRefresh);
			}
		});
	};


	session.resetNotifications = function() {
		session.notifications = [];
		session.notificationCount = 0;
		session.moreNotifications = true;
	};

	session.getNotifications = function(start) {
		// Get older notifications if no start specified
		if (start === undefined) {
			start = session.notifications.length;
		}
		// Ignore if notifications have been exhausted
		if (session.noMoreNotifications && start !== 0) {
			return false;
		}
		var params = {
			startFrom: start,
			userId: session.user.userId,
			web: 1
		};
		return Api.get('channel/getNotifications', params).success(function(data) {
			session.noMoreNotifications = data.hasNext ? false : true;
			// Ignore empty notifications
			if (!data.notifications) {
				return false;
			}
			// Append older items to the end
			session.notifications = params.startFrom === 0 ? data.notifications : session.notifications.concat(data.notifications);
			for (var i = 0; i < session.notifications.length; i++) {
				session.notifications[i].template = session.notifications[i].template.replace(session.notifications[i].userName, '');
			}
		});

	};

	session.getFan = function(id) {
		// If relationship is unknown, look it up and save
		if (session.fanStatus[id] === undefined && session.isFanQueue.indexOf(id) === -1) {
			// Use a queue so that multiple requests are batched (e.g. loading a friend list)
			session.isFanQueue.push(id);
			fetchFans();
		}
	};

	session.connect = function(type, source, userId) {
		trpx.capture({
			event: 'CLICK',
			extradata: 'CONNECT',
			field1: source
		}, trpx.captureGroups.trackevents);
		session.authenticate[type]().then(function(data) {
			data.origin = source;
			session.login(data, true).then(function(data) {
				session.fetchSettings(userId);
			});
		});
	};

	session.fetchSettings = function(userId) {
		if (session.loggedIn) {
			Api.get('channel/settings', {
				userId: userId
			}).success(function(data) {
				// Parse out the option array
				if (data.user) {
					angular.forEach(data.options, function(option) {
						if (option.optionValue == 8) {
							data.pubTwitter = option;
						}
						if (option.optionValue == 32) {
							data.keepYoutube = option;
						}
						if (option.optionValue == 64) {
							data.pubFacebook = option;
						}
						if (option.optionValue == 256) {
							data.youtubeSimulcast = option;
						}
						if (option.optionValue == 512) {
							data.hideCity = option;
						}
						if (option.optionValue == 1024) {
							data.youtubeAnnotations = option;
						}
						if (option.optionValue == 4096) {
							data.pubTumblr = option;
						}
						if (option.optionValue == 8192) {
							data.getUpdates = option;
						}
					});
					data.user.useprofile = Number(data.user.useprofile);
				}
				if (!data.user) {
					$timeout(function() {
						Api.showError(data);
						$state.go('main.channel.detail');
					}, 0);
				}
			});
		}
	};

	var fetchFans = function() {
		if (session.user && session.user.userId && session.isFanQueue.length && !session.isFanTimer) {
			session.isFanTimer = $timeout(function() {
				// Fan
				Api.get('channel/isFanOf', {
					userId: session.user.userId,
					channelIds: session.isFanQueue.join(',')
				}).success(function(data) {
					// Save for future lookups
					angular.forEach(data.fanOf, function(status, id) {
						if (status.indexOf('fan') != -1) {
							session.fanStatus[id] = true;
						} else {
							session.fanStatus[id] = false;
						}
					});
					// Clear the queue
					session.isFanQueue = [];
					session.isFanTimer = undefined;
				});
			});
		}
	};

	session.getSub = function(id) {
		// If relationship is unknown, look it up and save
		if (session.subStatus[id] === undefined && session.isSubQueue.indexOf(id) === -1) {
			// Use a queue so that multiple requests are batched (e.g. loading a friend list)
			session.isSubQueue.push(id);
			fetchSubs();
		}
	};
	var fetchSubs = function() {
		if (session.user && session.user.userId && session.isSubQueue.length && !session.isSubTimer) {
			session.isSubTimer = $timeout(function() {
				// Sub
				Api.get('channel/isSubscriberOf', {
					userId: session.user.userId,
					channelIds: session.isSubQueue.join(',')
				}).success(function(data) {
					// Save for future lookups
					angular.forEach(data.subscriberOf, function(status, id) {
						if (status.indexOf('sub') != -1) {
							session.subStatus[id] = true;
						} else {
							session.subStatus[id] = false;
						}
					});
					// Clear the queue
					session.isSubQueue = [];
					session.isSubTimer = undefined;
				});
			});
		}
	};

	session.isAdmin = function() {
		return config.checkRole(session.user, config.bootstrap.adminRoles);
	};
	session.isMod = function() {
		return config.checkRole(session.user, config.bootstrap.modRoles);
	};

	session.preventBroadcastInterrupt = function() {
		$translate('broadcasting_cant').then(function(value) {
			$modal.alert(value);
		});
	};

	session.showRightSidebar = function() {
		$rootScope.$evalAsync(function() {
			session.rightsidebar = true;
			session.getOnlineFriends();
		});
	};


	eventbus.subscribe('pusher:ban', function(event, message) {
		if (session.user) {
			if (message.message) {
				if (!session.user.banningMsg) {
					session.user.banningMsg = {};
				}
				session.user.banId = message.message.banId;
				session.user.banningMsg.msgString = message.message.messageText;
				session.user.banningMsg.supportBtn = {
					btnTxt_web: message.message.btnTxt_web,
					btnAct_web: message.message.btnAct_web
				};
				config.banningMsg = session.user.banningMsg;
				Api.showTopNotification('<div>' + session.user.banningMsg.msgString + '</div>' + '<a class="btn btn-confirm" target="_blank" href="' + session.user.banningMsg.supportBtn.btnAct_web + '">' + session.user.banningMsg.supportBtn.btnTxt_web + '</a>', 'now', true);
			}

			if (message === 0) {
				session.user.banId = 0;
				session.user.banningMsg = {};
				delete config.banningMsg;
				Api.closeTopNotification('sticky');
			}

			if (!swf.available()) {
				session.checkBan();
			}
		}
	}, 'session');

	eventbus.subscribe('user:update', function(event, data) {
		for (var key in data) {
			if (session.user[key] !== undefined) {
				session.user[key] = data[key];
			}
		}
	}, 'session');

	eventbus.subscribe('user:onNotificationCountChange', function(event, data) {
		$rootScope.$evalAsync(function() {
			session.notificationCount++;
			var isNotBroadcasting = !swf.broadcast || swf.broadcast && swf.broadcast.userId != session.user.userId,
				isNotGuesting = !guestService.guest || guestService.guest && guestService.guest.userId != session.user.userId,
				isNotMuted = swf.volume > 0;

			if ((isNotBroadcasting && isNotGuesting && isNotMuted) && document.getElementById('notificationSound')) {
				document.getElementById('notificationSound').play();
			}
		});
	}, 'session');

	return session;


})

;
