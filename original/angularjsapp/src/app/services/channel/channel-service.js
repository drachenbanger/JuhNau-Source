angular.module('younow.services.channel', [])

.factory('broadcasterService', function($rootScope, $http, $q, $location, $document, $window, $timeout, $state, $stateParams, $modal, config, session, Api, swf, pusher, eventbus, $interval, guestService, externalStreamer, $filter, trpx, webRtc, broadcasterServiceCore, selfies) {
	var serviceCore = new broadcasterServiceCore.Base(config);
	var service = angular.extend(serviceCore, {});

	//local variable to store the current broadcaster or channel or exploreBroadcaster
	var bc;

	service.setTab = function(variant) {
		service.asyncTabs = {};
		if ($stateParams.entityType) {
			service.asyncTabs.posts = true;
		} else {
			if (variant == 'A') {
				service.asyncTabs.broadcasts = true;
			}
			if (variant == 'B') {
				service.asyncTabs.posts = true;
			}
		}
	};

	service.getCurId = function() {
		var curId;
		if (service.broadcaster && service.broadcaster.userId && !service.channel) {
			curId = service.broadcaster.userId;
		} else if (service.exploreBroadcaster && service.exploreBroadcaster.userId) {
			curId = service.exploreBroadcaster.userId;
		} else if (service.channel && service.channel.channelId) {
			curId = service.channel.channelId;
		} else {
			curId = 0;
		}
		session.curId = curId;
		return curId;
	};

	service.getBroadcaster = function(id, username, async, bcMedia) {
		// Track
		service.trackBroadcaster();
		// Get the tag from the #hash if required
		if ($window.quickHash) {
			var tag = $window.quickHash.substr(1);
			$window.quickHash = '';
			return service.featuredBroadcaster(tag);
		}

		if (!id) {
			return service.featuredBroadcaster();
		}

		// Fetch user info
		var data = {};
		if (username) {
			data.user = id;
		} else {
			data.channelId = id;
		}
		data.curId = service.curId !== undefined ? service.curId : 0;
		return Api.get('broadcast/info', data)
			.success(function(data) {
				// If no user ID returned...
				if (!data.userId) {
					// If requested via username, see if it is a tag
					if (username) {
						return service.featuredBroadcaster(id);
					}
					// Otherwise, use the ID requested with
					else {
						data.userId = id;
					}
				}
				service.updateBroadcaster(data, async, bcMedia);
			});

	};

	service.trackBroadcaster = function() {
		if (service.broadcaster && service.viewtimeSeconds && !service.broadcaster.async) { // this runs before broadcaster is changed, so ignore if no previous (nothing to track), or if previous broadcast is async (profile page)
			eventbus.notifySubscribers('broadcast:end', service.broadcaster);
			//service.broadcaster.timeStarted = undefined;
			//service.viewtimeSeconds = 0; // instead reset when starting new broadcast or after tracking the ending broadcast
		}
	};

	service.switchBroadcaster = function(id, username, async) {
		service.curId = service.getCurId();
		//if it's a prerender always go to async page
		if (window.isPrerender) {
			async = true;
		}
		service.getBroadcaster(id, username, async).then(function() {
			if (service.broadcaster && service.broadcaster.userId) {
				service.showBroadcaster();
			}
		});
	};

	service.featuredBroadcaster = function(tag, noFans, goingLive) {
		// Fetch a featured broadcaster
		var data = {
			locale: config.UILocale
		};
		if (tag) {
			data.tag = tag;
		}
		if (noFans) {
			data.noFans = 1;
		}
		data.curId = service.getCurId();
		return Api.get('younow/featured', data)
			.success(function(data) {
				if (data.userId) {
					service.updateBroadcaster(data, false);
					service.showBroadcaster(goingLive);
				} else {
					// Load the blank state
					if (!tag) {
						$state.go("main.channel.detail");
						service.broadcaster = {
							broadcastId: 1
						};
					} else {
						missingUser();
						console.warn('user does not exist');
					}
				}
			});
	};

	service.getBc = function(type) {
		return bc;
	};

	service.updateBc = function(newBc) {
		if (!newBc) {
			return false;
		}
		bc = newBc;
		bc.channelSwitch = service.channelSwitch;
		return bc;
	};

	service.updateBroadcaster = function(data, async, bcMedia) {
		service.broadcaster = data;

		//BC = beforeChange = .broadcaster || .channel || .exploreBroadcaster
		eventbus.notifySubscribers('broadcaster:beforeChange', {});
		service.broadcaster = service.channelFormat(service.broadcaster);
		service.updateBc(service.broadcaster);
		trpx.updateBroadcast(data);

		// Disable chatMode... why not on broadcaster? forget, possibly because broadcaster is not ready or takes too long to switch, so need to have it always
		service.chatMode = data.chatMode || 0;

		// Check for a deeplink to a current broadcast
		if ($stateParams.entityId && service.broadcaster.broadcastId && $stateParams.entityId != "channel") {
			async = false;
		}

		// Switch to async if need be
		if (async || !service.broadcaster.broadcastId) {
			service.async = true;
		} else {
			service.async = false;
		}

		//set pageType if necessary
		if (window.waitForPageType) {
			if (!service.async || (!window.YouNow.track.pageFirst && !$stateParams.entityId && !$stateParams.entityType)) {
				window.waitForPageType = false;
				$rootScope.gaPage({
					pageType: service.async ? 'profile' : 'brdcst'
				});
			}
		}

		// if (!Api.store('hideYounowLanding')) {
		// 	if (!service.async) {
		// 		Api.showTopBanner($filter('translate')('welcome_title', {
		// 			value: data.profile
		// 		}), $filter('translate')('welcome_text', {
		// 			value: data.profile
		// 		}), $filter('translate')('welcome_button'), '/explore/', 'success', true, 'banner');
		// 		Api.store('hideYounowLanding', true);
		// 	}
		// }

		// Set the current channel id
		session.channelId = service.broadcaster.userId;


		if (service.broadcaster.user) {
			if (!service.broadcaster.user.description || service.broadcaster.user.description.length === 0) {
				service.broadcaster.user.description = Api.prepareDescription('');
			} else { //clean up descrption: Replace breaks with dots, replace double spaces with single, convert links and emojis
				service.broadcaster.user.description = Api.convertEmoji(Api.linkify(service.broadcaster.user.description.replace(/\s{2,}/g, ' ').replace(/(<br \/>)+/g, "<span class='line-break'> &#8226; </span> ")));
			}

			service.broadcaster.user.location = Api.cleanLocation(service.broadcaster.location, true);

			//add location
			if (service.broadcaster.user.location) {
				service.broadcaster.user.description = Api.trustedHTML(service.broadcaster.user.location + " <span class='line-break'> &#8226; </span> " + service.broadcaster.user.description.$$unwrapTrustedValue());
			}

			//add bcmedia node if it exists
			if (bcMedia !== undefined) {
				service.bcMedia = bcMedia;
			}
		}

		// Clear channel info
		if (service.async === false) {
			service.channel = undefined;
		}

		service.ready = true;

		var deferred = $q.defer();

		deferred.resolve(service.broadcaster);

		return deferred.promise;

	};

	service.showBroadcaster = function(goingLive) {
		// ASYNC (profile)
		if (service.async) {
			service.setChannel();
			return false;
		}
		// LIVE
		// track viewtime - start/reset
		service.viewtimeSeconds = 0; // 0 seconds
		// Show the Google Ad in sidebar, now that a tag is known
		// Api.loadGoogleAds(service.broadcaster.tags[0]);
		if (swf.currentSession && !swf.settingUpBroadcast && swf.currentSession.isBroadcasting) {
			// Update the player state
			session.isBroadcasting = true;
			swf.settingUpBroadcast = false;
		}
		//if starting a broadcast switch states and update BCer
		else if (swf.settingUpBroadcast) {
			swf.currentSession.isBroadcasting = true;
			guestService.newBroadcaster();
			swf.newBroadcaster(service.broadcaster, goingLive);
			selfies.newBroadcaster(service.broadcaster);
		} else {
			guestService.newBroadcaster();
			swf.newBroadcaster(service.broadcaster);
			selfies.newBroadcaster(service.broadcaster);
		}

		//check if 3rd party streamer
		// if(service.broadcaster && )

		//user is in the guestlist
		if (service.broadcaster && service.broadcaster.guestInfo) {
			guestService.newUserGuestObj(service.broadcaster.guestInfo);
		} else {
			guestService.updateUserGuestObj();
		}


		//update user guest object and state if guest exists
		if (service.broadcaster && service.broadcaster.guestBroadcaster) {
			guestService.newGuestObj(service.broadcaster.guestBroadcaster);
			if (service.broadcaster.userId == session.user.userId) {
				guestService.overlayStates.guest = 'connected';
			}
		} else {
			guestService.updateGuestObj();
		}

		//update selfie object if selfie is currently enabled by broadcaster
		if (service.broadcaster && service.broadcaster.selfie) {
			selfies.newSelfie(service.broadcaster.selfie);
		} else {
			selfies.clearSelfies();
		}

		// Update the URL (if available)
		if (service.broadcaster.profile && (service.broadcaster.profile !== $stateParams.profileUrlString || $stateParams.entityId === "channel")) {
			service.internalLocationChange(service.broadcaster.profile);
		}

		// Set Page Title
		$timeout(function() {
			if (service.broadcaster && service.broadcaster.user) {
				$rootScope.title = 'YouNow | ' + service.broadcaster.user.profileUrlString + ' | Live Stream Video Chat | Free Apps on Web, iOS and Android';
				// track
				if (window.location.pathname != '/') {
					$rootScope.gaPage({
						page: 'Broadcast'
					});
				}

			}
		}, 1000);

		if (!window.YouNow.track.pageFirst) {
			$rootScope.gaPage();
		}

		// Subscribe to Pusher
		pusher.ready().then(function() {
			pusher.subscribeToChannel(service.broadcaster.userId, service.channelSwitch, session.user.sec_token);
		});

		//remove the old playData loop and delete it from the utility looping function
		if (Api.polls && Api.polls.getPlayData) {
			$interval.cancel(Api.polls.getPlayData);
			delete Api.polls.getPlayData;
		}

		// Fetch play data on a loop
		getPlayData();

	};

	var getPlayData = function() {
		var method;
		// Ignore if not broadcasting (typically because user was changed during timeout)
		if (!service.broadcaster || !service.broadcaster.broadcastId) {
			return false;
		}

		if (($state.current.name !== 'main.channel.detail' || service.async) && Api.polls.getPlayData) {
			return false;
		}

		var heartbeat = {
			response: undefined,
			type: undefined
		};

		if (session.user && swf.broadcast && session.user.userId === swf.broadcast.userId) {
			heartbeat.response = swf.invokeSwfMethod('onBroadcast');
			heartbeat.type = "broadcaster";
		} else {
			heartbeat.response = swf.invokeSwfMethod('onPlayback');
			heartbeat.type = "viewer";
		}

		//check for timestamp from swf, if it errors out to NaN then we must attempt a reload
		if (heartbeat.response !== undefined && isNaN(heartbeat.response.nsTime)) {
			if (heartbeat.type === "viewer") {
				window.YouNow.App.loadChannel({
					channelId: swf.broadcast.userId
				});
			}
			if (heartbeat.type === "broadcaster") {
				swf.invokeSwfMethod('startBroadcast', service.bcMedia);
			}
			window.YouNow.App.stateChange('RECONNECT');
		} else {
			if (swf.playState === 'RECONNECT') {
				window.YouNow.App.stateChange('PLAYING');
			}
		}

		if (guestService.state === 'connected' || (session.isBroadcasting && session.user.partner == 1)) {
			webRtc.getStats();
		}
		if (service.broadcaster.tagPlayData.indexOf('https') === -1) {
			service.broadcaster.tagPlayData = service.broadcaster.tagPlayData.replace("http", "https");
		}
		config.init.then(function() {
			$http.get(service.broadcaster.tagPlayData)
				.then(function(response) {
					angular.forEach(response.data.items, function(person, key) {
						person.tooltip = '<div class="user-row"><span class="ynicon ynicon-level"></span><span class="level">' + person.userlevel + '</span> <span class="name">' + person.username + '</span></div><div class="viewer-row"><span class="ynicon ynicon-viewers"></span> <span class="viewers">' + person.viewers + '</span></div>';
						if (session.user && person.userId == session.user.userId) {
							service.broadcaster.tagRank = '#' + (key + 1);
						}
						if (person.userId == swf.broadcast.userId) {
							service.bcQueuePos = key + 1;
						}
						person.id = config.settings.UseBroadcastThumbs ? person.broadcastId : person.userId;
						person.thumb = Api.generateDynamicApi('BROADCAST_THUMB_DYNAMIC') + '/' + person.broadcastId + '/' + person.broadcastId + '.jpg';
						//person.thumb_backup = Api.generateDynamicApi('BROADCAST_THUMB') + '/' + person.broadcastId + '/' + person.broadcastId + '.jpg';
						//person.thumb = config.broadcasterThumb+person.id;
						person.thumb_backup = config.broadcasterThumb + person.id;
					});

					swf.queue = response.data.items;

					// Repeat
					if (!service.async) {
						Api.poll(getPlayData, 'getPlayData', response.data.nextRefresh);
					}
				});
		});
	};

	service.setChannel = function() {

		// end broadcast
		eventbus.notifySubscribers('broadcast:end', service.broadcaster);

		// begin ASYNC (profile page)

		service.broadcaster.async = true;
		var postData = {
			channelId: service.broadcaster.userId
		};
		var useCDN = 'usecdn';
		if (session.user && session.user.userId == service.broadcaster.userId) {
			useCDN = '';
			postData.random = Math.random();
		}
		postData.includeUserKeyWords = 1;

		Api.get('channel/getInfo', postData, useCDN).success(function(data) {
			//Show to the banner for new visitors landing on the async
			if (!Api.store('hideYounowLanding')) {
				if (service.async) {
					//Api.showTopBanner('Become a fan of ' + data.profile + ' on YouNow!', 'Fan ' + data.profile + ' and never miss a broadcast, or discover more amazing broadcasters live streaming on YouNow!', 'Explore More Broadcasters', '/explore/', 'success', true, 'banner');
					Api.store('hideYounowLanding', true);
				}
			}
			if (!data.userId) {
				missingUser();
				return true;
			}

			// Format and save the data
			data.displayDescription = Api.convertEmoji(Api.prepareDescription(data.description));
			data.fullName = data.useprofile == 1 ? data.profile : data.firstName + " " + data.lastName;
			data.location = Api.cleanLocation(data);
			data.facebookLink = (data.facebookOption == "1" && data.websiteUrl.length) ? data.websiteUrl : 'http://www.facebook.com/' + data.facebookId;
			if (data.facebookLink.substr(0, 4) != 'http') {
				data.facebookLink = 'http://' + data.facebookLink;
			}
			data.youtubePath = ['user', 'channel'].indexOf(data.youTubeUserName.split('/')[0]) > -1 ? data.youTubeUserName : 'user/' + data.youTubeUserName;
			service.channel = service.channelFormat(data);
			service.channel.finished = {}; // Keep track of whether there are more available of each post type
			service.channel.index = {}; // Keep track of unique item ids to prevent duplicates
			// Subscribe to Pusher
			service.subscribeToAsyncPusher();

			// Update URL if needed
			if (service.channel.profile !== $stateParams.profileUrlString) {
				service.internalLocationChange(service.channel.profile);
			}

			// Set Page Title
			$timeout(function() {
				if (!service.channel) {
					return false;
				}
				$rootScope.title = 'YouNow | ' + service.channel.profile + ' | Live Stream Video Chat | Free Apps on Web, iOS and Android';
			}, 1000);

			// Show a Google Ad in sidebar, specific to the current user
			// Api.loadGoogleAds(service.channel.profile);

			// Clear the comment box
			angular.element(document.getElementById('textarea_')).empty();

			// Show initial posts
			var params = {};
			// Get deeplinked post
			if ($stateParams.entityId && $stateParams.entityType) {
				params.entityId = $stateParams.entityId;
				params.deepLink = $stateParams.entityType;
			}
			// Otherwise get pinned post
			else {
				params.getPinned = 1;
			}

			// Fetch the data
			service.getItems('posts', params).then(function() {
				// When ready, show the right column
				if (!params.entityId) {
					getRightColumn();
				}
				// Or highlight the deeplinked post
				else {
					service.showDeepLink();
				}
			});

			// count services
			var total = 4;
			var connected = 0;
			if (service.channel.twitterId && service.channel.twitterId.length) {
				connected++;
			}
			if (service.channel.facebookId && service.channel.facebookId.length) {
				connected++;
			}
			if (service.channel.youTubeUserName && service.channel.youTubeChannelId.length) {
				connected++;
			}
			if (service.channel.instagramHandle && service.channel.instagramHandle.length) {
				connected++;
			}
			if (service.channel.googleId && service.channel.googleId.length) {
				connected++;
				total++;
			}
			service.channel.socialRatio = connected + '/' + total;
			service.channel.socialRatioCap = connected === total ? true : false;

			// add subscriptions
			if (service.channel_subscriptions_temp && service.channel_subscriptions_temp.length > 8) {
				service.channel.subscriptions = service.channel_subscriptions_temp;
				service.channel.subscriptions_extras = service.channel.subscriptions.splice(7);
				service.channel.subscriptions_extras.reverse();
				delete service.channel_subscriptions_temp;
			} else {
				service.channel.subscriptions = [];
				service.channel.subscriptions_extras = [];
			}

			//format the totial views
			if (service.channel.totalViews !== undefined) {
				service.channel.totalViews = $filter('number')(service.channel.totalViews);
			}

			if (service.channel.snKeyWords) {
				for (var sn in service.channel.snKeyWords) {
					if (service.channel.snKeyWords[sn].url && service.channel.snKeyWords[sn].url.substring(0, 4) == 'www.') {
						service.channel.snKeyWords[sn].url = 'http://' + service.channel.snKeyWords[sn].url;
					}
					if (sn != 'facebook' && sn != 'google') {
						service.channel.snLinks = true;
					}
				}
			}
		});

		// all subscriptions
		Api.get('channel/getSubscriberOf/channelId=' + service.broadcaster.userId, {}, useCDN).success(function(data) {
			if (data.subscriberOf) {
				if (service.channel) {
					service.channel.subscriptions = data.subscriberOf;
					if (service.channel.subscriptions.length > 8) {
						service.channel.subscriptions_extras = service.channel.subscriptions.splice(7);
						service.channel.subscriptions_extras.reverse();
					}
					delete service.channel_subscriptions_temp;
				} else {
					service.channel_subscriptions_temp = data.subscriberOf;
				}
			} else {
				console.error('channel/getSubscriberOf/channelId=' + service.broadcaster.userId + ':', data);
			}
		}, function(error) {
			//console.log('getSubscriberOf FAILED', error);
		});

	};

	service.showDeepLink = function() {
		$timeout(function() {
			if (service.broadcaster.broadcastId && (service.broadcaster.broadcastId == $stateParams.entityId)) {
				$location.path('/' + $stateParams.profileUrlString);
				return false;
			}
			if ($stateParams.entityId && $stateParams.entityType) {
				if (!service.broadcaster.broadcastId) {
					trpx.updateBroadcast({
						broadcastId: $stateParams.entityId
					});
				} // set tracking broadcastid from url
				service.deeplinkId = service.channel.posts && service.channel.posts[0] && $stateParams.entityType !== 'c' ? service.channel.posts[0].id : $stateParams.entityId; // note this is dangerous, assuming the first post is the deeplinked post
				var deepPost = document.getElementById('post_' + service.deeplinkId);
				if (deepPost) {
					var scrollToElement = angular.element(document.getElementById('post_' + service.deeplinkId));
					$document.scrollTo(scrollToElement, 0, 1000).then(function() {
						// Remove highlight after a dely
						$timeout(function() {
							service.deeplinkId = 0;
						}, 1500);
						// If it's a broadcast, trigger the modal
						if ($stateParams.entityType === 'b' || $stateParams.entityType === 'f') {
							if (service.channel.posts[0] && service.channel.posts[0].media && service.channel.posts[0].media.broadcast && service.channel.posts[0].media.broadcast.videoAvailable) {
								$modal.mediaPlayerModal($stateParams.entityId);
							} else {
								archiveUnavailable('NOVIDEO');
							}
						}
						// Get right column once animation is complete
						$timeout(function() {
							getRightColumn();
						}, 1500);
					});
				} else {
					archiveUnavailable('NOPOST');
				}
			}
		}, 500);
	};

	var archiveUnavailable = function(reason) {
		trpx.capture({
			event: 'ARCHIVE_UNAVAILABLE',
			extradata: reason,
			platform: 3
		}, trpx.captureGroups.trackevents);
		Api.showTopNotification('Sorry, this broadcast is no longer available');
	};

	service.updateLanguage = function(language) {
		session.updateLanguage(language);
	};

	service.updateLocale = function(locale) {
		// backend
		var params = {
			userId: session.user.userId,
			channelId: session.user.userId,
			locale: locale
		};
		if (session.isBroadcasting || swf.settingUpBroadcast || (guestService.guest && guestService.guest.userId == session.user.userId)) {
			session.preventBroadcastInterrupt();
			return false;
		}
		Api.post('channel/updateSettings', params)
			.then(function(response) {
				if (response.data.errorCode === 0) {
					// frontend
					config.UILocale = locale;
					service.featuredBroadcaster(false, true);
					trpx.updateLocale(locale);
				}
			});
	};

	var methods = {
		posts: 'post/get',
		broadcasts: 'post/getBroadcasts',
		fans: 'channel/getFans',
		fansof: 'channel/getFansOf',
		subscribers: 'channel/getSubscribers'
	};
	var items = {
		posts: 'posts',
		broadcasts: 'posts',
		fans: 'fans',
		fansof: 'fans',
		subscribers: 'subscribers'
	};

	service.getItems = function(type, params) {

		if (!type) {
			type = service.tab;
		}
		if (!params) {
			params = {};
		}

		// Return false if not ready or finished loading this tab
		if (!service.channel || service.channel.finished[type]) {
			return $q.reject();
		}

		params.channelId = service.broadcaster.userId;
		// Paginate request
		if (service.channel[type]) {
			params.startFrom = service.channel[type].length;
		}
		// Fetch user specific data
		if (items[type] === 'posts' && session.user && session.user.userId) {
			params.userId = session.user.userId;
		}

		//make certain profile API requests CDN
		var cdnRequests = ['fansof', 'fans', 'subscribers', 'broadcasts'];
		var isCdn = false;
		if (cdnRequests.indexOf(type) !== -1) {
			isCdn = true;
		}

		return Api.get(methods[type], params, isCdn)
			.success(function(data) {

				//Check if user has changed states and therefore cleared channel
				if (!service.channel) {
					return $q.reject();
				}
				// Add items to array, and keep track to prevent duplicates
				angular.forEach(data[items[type]], function(item) {
					addItem(item, type);
				});
				// Determine if all items loaded
				service.channel.finished[type] = items[type] === 'posts' ? !data.hasMore : !data.hasNext;
				if (params.numberOfRecords === 1) {
					service.channel.finished[type] = false;
				} // TODO: backend bug saying finished when not
				if (service.channel.finished[type]) {
					$rootScope.hideFooter = false;
				}
			});
	};

	var addItem = function(item, type) {
		if (item.media && item.media.broadcast && item.media.broadcast.broadcastLength) {
			item.media.broadcast.broadcastLengthString = secondsToString(item.media.broadcast.broadcastLength);
		}

		if (!service.channel[type]) {
			service.channel[type] = [];
		}
		if (!service.channel.index[type]) {
			service.channel.index[type] = {};
		}
		var id = item.id || item.userId;
		if (!service.channel.index[type][id]) {
			service.channel[type].push(item);
			service.channel.index[type][id] = true;
		}
	};

	var secondsToString = function(secs) {
		// format
		var hrs = (Math.floor(secs / 3600) || '') + '';
		var hrs_ = '';
		if (hrs) {
			hrs_ = ':';
		}
		var min = (Math.floor((secs % 3600) / 60) || '0');
		var _min = '';
		if (min < 10 || min == '0') {
			_min = '0';
		}
		var min_ = ':';
		var _sec = '';
		var sec = (secs % 60) || '0';
		if (sec < 10 || sec == '0') {
			_sec = '0';
		}
		// set
		var string = hrs + hrs_ + _min + min + min_ + _sec + sec;
		// done
		return string;
	};

	var getRightColumn = function() {
		service.getItems('broadcasts', {
			numberOfRecords: 1
		}).then(function() {
			if (service.channel) {
				if (!service.broadcaster.broadcastId) {
					service.channel.preview = (service.channel.broadcasts && service.channel.broadcasts[0]) ? 'recent' : 'prompt';
				}
				getBiggestFans();
				getMoreBroadcasters();
			}
		});

	};

	var getMoreBroadcasters = function() {

		// Ignore if no longer on async
		if (!service.channel || !service.async) {
			return false;
		}

		var params = {
			channelId: service.broadcaster.userId
		};

		return Api.get('reco/broadcastersAnon', params, true)
			.success(function(data) {
				service.channel.moreBroadcasters = data.items;
				service.channel.moreBroadcastersModelId = data.modelId;
			});

	};

	var getBiggestFans = function() {
		// Ignore if no longer on async
		if (!service.channel || !service.async) {
			return false;
		}

		var params = {
			numberOfRecords: 12,
			channelId: service.broadcaster.userId
		};

		return Api.get('channel/getTopPaidFans', params, true)
			.success(function(data) {
				// Ignore if the channel has changed
				if (!service.channel || service.channel.userId != params.channelId) {
					return false;
				}
				// Unlike getOnlineFans(), do not ignore if no total returned
				if (service.channel) {
					service.channel.biggestFans = Api.sortUsers(data.fans);
				}
			});

	};

	var liveBroadcastNotification = function() {
		var curId = service.curId !== undefined ? service.curId : 0;
		Api.get('broadcast/info', {
				channelId: service.broadcaster.userId,
				curId: curId
			})
			.then(function(data) {
				if (data) {
					data = data.data;
					if (!data.media) {
						$timeout(function() {
							liveBroadcastNotification();
						}, 2000);
					} else {
						service.updateBroadcaster(data, true)
							.then(function(response) {
								if (service.channel) {
									service.channel.preview = false;
									var href = "window.location.href='/" + data.profile + "?from=notification';";
									Api.showTopNotification('<a href="javascript:' + href + ';" >' + data.profile + ' just went live! Click here to watch them.</a>', "success", false, false, 10000);
								}
							});
					}
				}
			});
	};

	service.goLive = function() {
		if (session.isBroadcasting) {
			session.preventBroadcastInterrupt();
		} else if (session.checkBan()) {
			return false;
		} else {
			if (session.user.userId) {
				swf.settingUpBroadcast = true;
				service.switchToBroadcast(true);
			} else {
				session.showLoginModal('', 'GOLIVE').result.then(service.goLive);
			}
		}
	};

	// Must switch to flash before going live or showing tutorial
	service.switchToBroadcast = function(goingLive) {
		if (!swf.available()) {
			if (service.broadcaster && service.broadcaster.broadcastId) {
				service.switchAsync(false);
			} else {
				service.async = false;
				service.broadcaster = undefined;
				service.featuredBroadcaster(false, false, goingLive);
			}
		}
	};

	service.internalLocationChange = function(profile) {
		service.internalUpdate = true;
		$location.path('/' + profile);
		$location.hash('');
	};

	service.initBroadcast = function() {
		return Api.post('broadcast/init', {
			userId: session.user.userId,
			channelId: session.user.userId,
			ver: config.settings.JS_VERSION,
			mirror: 0
		});
	};

	service.addBroadcast = function(id, tag, publish, shareMsg, pc) {
		//tag += ',multitag';
		var params = {
			userId: session.user.userId,
			channelId: session.user.userId,
			broadcastId: id,
			ver: config.settings.JS_VERSION,
			tags: tag,
			fbPublish: publish.facebook ? 1 : 0,
			twPublish: publish.twitter ? 1 : 0,
			ytPublish: publish.youtube ? 1 : 0,
			tumblrPublish: publish.tumblr ? 1 : 0,
			mirror: 0,
			shareMsg: shareMsg
		};
		if (config.mcu && pc) {
			params.mcu = config.mcu;
			params.sdpOffer = pc.localDescription.sdp;
		} else {
			if (externalStreamer.settings.active) {
				params.broadcastType = 2;
			} else {
				params.broadcastType = 1;
			}
		}
		return Api.post('broadcast/add', params);
	};

	service.reconnect = function(pc) {
		var params = {
			userId: session.user.userId,
			sdpOffer: pc.localDescription.sdp
		};
		return Api.post('broadcast/reconnect', params);
	};

	service.dropBroadcast = function(id) {
		if (id) {
			return Api.post('broadcast/drop', {
				userId: id,
				channelId: id
			});
		}
	};

	var missingUser = function() {
		if (window.location.pathname.indexOf('/channel') !== -1 && window.waitForPageType) {
			$rootScope.gaPage({
				pageType: 'explore'
			});
		}
		window.waitForPageType = false;
		$state.go("main.explore");
		Api.showTopNotification('User could not be found');
		if (window.isPrerender) {
			$rootScope.httpStatus = 404;
		}
	};


	// Listen for loadChannel event from SWF
	$rootScope.$watch(function() {
		return swf.loadChannel;
	}, function(data) {
		if (data) {
			if (data.broadcaster !== undefined) {
				data.isBroadcasting = data.broadcaster == 1 ? true : false;
			}
			if (data.isBroadcasting !== undefined) {
				// Set broadcast status (being synced in the swf)
				swf.currentSession.isBroadcasting = data.isBroadcasting;
				session.isBroadcasting = data.isBroadcasting;
			}

			Api.googleAdLoaded = !session.isBroadcasting;
			// If SWF requests a channel, load it
			if (data.channelId) {
				service.channelSwitch = "END";

				service.switchBroadcaster(data.channelId);
			}
			// If SWF returns 0, load featured
			else if (data.channelId === 0 && !data.isBroadcasting) {
				service.featuredBroadcaster();
			}
			//always shut off the settingUpBroadcast flow when loading a new channel
			if (data.channelId !== undefined) {
				swf.settingUpBroadcast = false;
			}
		}
	});

	service.switchAsync = function(async) {
		service.async = async;
		if (async) {
			// If the channel has not been loaded yet, load it
			if (!service.channel) {
				service.setChannel();
			}
			// Otherwise, quick switch
			else {
				service.subscribeToAsyncPusher();
			}
		} else {
			service.showBroadcaster();
		}
	};

	service.subscribeToAsyncPusher = function() {
		pusher.ready().then(function() {
			pusher.subscribeToAsync(service.broadcaster.userId, function(eventName, eventData) {
				if (eventName === 'onBroadcast') {
					liveBroadcastNotification();
				}

				if (eventName === 'ontrackBroadcastViewtime') {
					service.broadcaster.broadcastId = false;
					getRightColumn();
				}
				// Only need realtime functionality on posts & broadcasts
				if (service.tab !== 'posts' && service.tab !== 'broadcasts') {
					return true;
				}
				// Set which tab is currently showing
				if (!service.channel[service.tab]) {
					service.channel[service.tab] = [];
				}
				if (!service.channel.index[service.tab]) {
					service.channel.index[service.tab] = {};
				}
				realtime.posts = service.channel[service.tab];
				realtime.index = service.channel.index[service.tab];
				if (realtime[eventName]) {
					realtime[eventName](eventData.message);
				}
			});
		});
		// @ptrwtts TODO
		// This way of handling realtime events on async is flawed
		// Instead of scanning through arrays of post / broadcast / replies,
		// looking for the relevant item, all items should be kept on an index,
		// along with arrays that reference the items
		// This way, if you want to edit an item, simply look it up
		// If an item doesn't exist, ignore the command
		// For new_comments, examine to see if it is a post or broadcast
	};

	// service.channelFormat moved to core
	swf.channelFormat = angular.copy(service.channelFormat); // so swf can call this without a circular dependency (not alias, or risk making the circular dependency anyway)

	service.getDownloadUrl = function(broadcastId) {
		var downloadUrl = config.settings.ServerHomeBaseUrl + 'php/api/broadcast/download/';
		downloadUrl += 'channelId=' + service.channel.userId;
		downloadUrl += '&broadcastId=' + broadcastId.toString();
		if (session && session.user && session.user.userId) {
			downloadUrl += '&userId=' + session.user.userId;
			// TODO: this fails if the user was logged out when the page was loaded
		}
		return downloadUrl;
	};

	service.realtime = {};
	var realtime = service.realtime;

	var findPosition = function(id, posts) {
		for (var i = 0; i < posts.length; i++) {
			if (posts[i].id == id) {
				return i;
			}
		}
	};

	realtime.new_comment = function(comment) {
		// Add a normal comment to the top
		if (!comment.parentId) {
			service.channel.posts.unshift(comment);
			service.channel.index[comment.id] = true;
		}
		// Add a reply to the bottom of parent replies
		else {
			var parent = realtime.posts[findPosition(comment.parentId, realtime.posts)];
			if (parent) {
				if (!parent.replies) {
					parent.replies = [];
				}
				parent.replies.push(comment);
			}
		}
	};

	realtime.new_like = function(like) {
		changeLikes(like, 1);
	};

	realtime.unlike_comment = function(like) {
		changeLikes(like, -1);
	};

	var changeLikes = function(like, change) {
		var item;
		if (like.parentId) {
			var parent = realtime.posts[findPosition(like.parentId, realtime.posts)];
			if (parent) {
				item = parent.replies[findPosition(like.id, parent.replies)];
			}
		} else {
			item = realtime.posts[findPosition(like.id, realtime.posts)];
		}
		if (item) {
			item.changeLikes(change);
		}
	};

	realtime.pin_comment = function(comment) {
		for (var i = 0; i < realtime.posts.length; i++) {
			var post = realtime.posts[i];
			post.isPinned = false;
			if (realtime.posts[i].id == comment.id) {
				post.isPinned = true;
				realtime.posts.splice(0, 0, realtime.posts.splice(i, 1)[0]);
			}
		}
	};

	realtime.delete_comment = function(comment) {
		if (comment.parentId) {
			var parent = realtime.posts[findPosition(comment.parentId, realtime.posts)];
			if (parent) {
				parent.replies.splice(findPosition(comment.id, parent.replies), 1);
			}
		} else {
			realtime.posts.splice(findPosition(comment.id, realtime.posts), 1);
		}
	};

	return service;

})

;
