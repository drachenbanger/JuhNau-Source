angular.module('younow.explore', [])

.config(function($stateProvider) {

	$stateProvider.state('main.explore', {
		url: '{la:[' + window.YouNow.UILocalesRegex + ']*}/explore/:tag?q',
		params: {
			tag: {
				value: null,
				squash: true
			},
			q: {
				value: null,
				squash: true
			}
		},
		templateUrl: 'angularjsapp/src/app/states/main/explore/explore.tpl.html',
		controller: 'ExploreCtrl'
	});

})

.controller('ExploreCtrl', function($window, $rootScope, $scope, $stateParams, $location, $timeout, $modal, config, Api, broadcasterService, swf, $state, trackingPixel, eventbus, trackingPixel, debug, $filter) {

	$rootScope.hideFooter = true;
	$scope.showMiniplayer = false;
	$scope.results = [];
	$scope.queue = [];
	$scope.broadcasterService = broadcasterService;
	$scope.swf = swf;
	$scope.gettingItems = false;

	$scope.getQueueLoading = false;
	$scope.getQueue = function() {
		if ($scope.getQueueLoading) {
			return false;
		}
		var params = {
			numberOfRecords: 20,
			startFrom: $scope.queue.length || 0,
			locale: config.UILocale
		};
		var query = $scope.query;
		if (query.substr(0, 1) === "#") {
			query = query.substr(1);
			params.tag = query;
			$scope.getQueueLoading = true;
			Api.get("younow/queue", params).success(function(data) {
				$scope.getQueueLoading = false;
				if (data.queues && data.queues[0] && data.queues[0].items) {
					data.data = data.queues[0].items;
					// shore more?
					if (data.data.length > 8) {
						// remove duplicates
						for (var d in data.data) {
							for (var q in $scope.queue) {
								if (data.data[d] && $scope.queue[q] && data.data[d].userId == $scope.queue[q].userId) {
									delete data.data[d];
								}
							}
						}
						data.data = data.data.slice(0, 8);
						$scope.queueMore = true;
					} else {
						$scope.queueMore = false;
					}

					if (!$scope.broadcast) {
						$scope.showMiniplayer = true;
						$scope.broadcast = data.data[0];
						$scope.broadcast.tag = query;
						$scope.selectUser($scope.broadcast, true);
					}
					handleQueue(data);
				}

			});
		}
	};


	$scope.getItems = function(query, numberOfRecords) {
		if ($scope.getItemsLoading) {
			//return $q.reject('previous request still loading');
			return false;
		}
		if (!query && query !== '') {
			query = $scope.query;
		} // If empty, use last query (get more)
		if (!$scope.results || query !== $scope.query) {
			$scope.results = [];
		} // If different, reset
		$scope.query = query;

		var params = {
			numberOfRecords: numberOfRecords || 20,
			startFrom: $scope.results.length || 0,
			locale: config.UILocale
		};
		if (!query) {
			// ALL - trendingUsers
			$scope.getItemsLoading = true;
			$scope.resultsView = 'old';
			return Api.get("younow/trendingUsers", params).success(function(data) {
				$scope.getItemsLoading = false;
				if (data.trending_users) {
					data.data = data.trending_users;
					handleResults(data);
				}
			});
		} else if (query.substr(0, 1) === "#") {
			// TAG - top section above this one, get initial results
			if (!$scope.queue.length) {
				$scope.getQueue($scope.query, 8);
			}
			// TAG - younow/topBroadcasters
			query = query.substr(1);
			params.tag = query;
			$scope.getItemsLoading = true;
			delete params.locale;
			$scope.resultsView = 'new';
			return Api.get("younow/topBroadcasters", params, true).success(function(data) {
				$scope.getItemsLoading = false;
				if (data.items && data.items[0]) {
					data.data = data.items;
					handleResults(data);
				}
				//get Editor's pick if EP tag
				if (config.settings.featuredTags[config.UILocale] && $stateParams.tag) {
					var tags = config.settings.featuredTags[config.UILocale],
						i = 0;
					for (i; i < tags.length; i++) {
						if (query === tags[i].tag) {
							getEps(query);
							return false;
						}
					}
				}
			});
		} else {
			// SEARCH - algolia
			$scope.resultsView = 'old';
			var restrict = query.substr(0, 1) === "#" ? "tag" : false;
			if (restrict) {
				query = query.substr(1);
			}
			var limit = params.numberOfRecords;
			var page = params.numberOfRecords ? Math.round(params.startFrom / params.numberOfRecords) : 0;
			$scope.getItemsLoading = true;
			return Api.algolia(query, restrict, limit, page).success(function(data) {
				$scope.getItemsLoading = false;
				if (data.hits) {
					//data.hits = data.hits;
					handleResults(data);
				}
			});
		}
	};

	//show banner for first time visiters and then cookie them
	if (!Api.store('hideYounowLanding') && !$stateParams.q) {
		if ($stateParams && $stateParams.tag && $stateParams.tag.length > 0) {
			Api.showTopBanner('#' + $stateParams.tag + ' ' + '<span translate="explore_welcome_title_tag">', '<span translate="explore_welcome_text_tag" translate-values="{value: \''+$stateParams.tag+'\'}"></span>', undefined, undefined, 'success', true, 'banner');
		} else {
			Api.showTopBanner('<span translate="explore_welcome_title"></span>', '<span translate="explore_welcome_text"></span>', '<span translate="explore_welcome_lucky"></span>', '/featured', 'success', true, 'banner');
		}
		Api.store('hideYounowLanding', true);
	}

	try {
		jwplayer.key = config.settings.JW_PLAYER_KEY;
	} catch (err) {
		document.addEventListener('{CDN_BASE_URL}/js/jwplayer6.7/jwplayer.js', function() {
			jwplayer.key = config.settings.JW_PLAYER_KEY;
		});
	}
	$scope.query = $stateParams.tag ? "#" + $stateParams.tag : $stateParams.q;
	$rootScope.title = $stateParams.tag ? 'YouNow | ' + $stateParams.tag + ' | Live Stream Video Chat | Free Apps on Web, iOS & Android' : 'YouNow | Live Stream Video Chat | Free Apps on Web, iOS and Android';
	$scope.getItems($scope.query)
		.then(function(response) {
			$scope.selectUser($scope.results[0], true);
			if (!$scope.query) {
				getVips();
			}
		})
		.catch(function(e) {
			console.warn(e);
		});
	$scope.tag = ($stateParams.q || $stateParams.tag ? $scope.query : '').replace('#', '');
	var path = $scope.query ? '/explore/' + $scope.query : '/explore/';
	$rootScope.gaPage({
		page: 'Explore',
		path: path
	});


	$scope.getItemsLoading = false;

	var handleQueue = function(data) {
		// data.data   is alias for  data.trending_users   or  data.queues[0].items
		if (data.data && config.settings.UseBroadcastThumbs) {
			$scope.useBroadcastThumbs = true;
		}
		if (data.data) {
			angular.forEach(data.data, function(user, i) {
				if (user.tags) {
					user.tag = user.tags[0];
				}
				user.level = Math.round(user.level || user.userlevel);
				user.fullName = Api.fullName(user);
				user.thumb = getBroadcastThumb(user);
			});
			data.totalUsers = data.totfal;
			$scope.queue = $scope.queue.concat(data.data);
		}
		// Show message for no queue
		$scope.noresults = $scope.queue.length === 0;
		// Figure out if finished
		if ($scope.queue.length >= data.nbHits) {
			$scope.finished = true;
			$rootScope.hideFooter = false;
		}
	};

	var handleResults = function(data) {
		// data.data   is alias for  data.trending_users   or  data.queues[0].items
		if (data.data && config.settings.UseBroadcastThumbs) {
			$scope.useBroadcastThumbs = true;
		}
		if (data.data) {
			angular.forEach(data.data, function(user, i) {
				if (!user.profile) {
					user.profile = user.name || user.username;
				}
				if (user.tags) {
					user.tag = user.tags[0];
				}
				user.level = Math.round(user.level || user.userlevel);
				user.fullName = Api.fullName(user);
				user.thumb = getBroadcastThumb(user);
				user.thumb_backup = getBroadcastThumb(user, true);
				user.cover = config.settings.ServerCDNBaseUrl + '/php/api/channel/getCover/channelId=' + user.userId;
			});
			data.totalUsers = data.totfal;
			$scope.results = $scope.results.concat(data.data);
		}
		if (data.hits) {
			angular.forEach(data.hits, function(user, i) {
				user.userId = user.objectID;
				user.fullName = Api.fullName(user);
				user.thumb = getBroadcastThumb(user);
			});
			$scope.results = $scope.results.concat(data.hits);
		}
		// Show message for no results
		$scope.noresults = $scope.results.length === 0;
		// Figure out if finished
		if ($scope.results.length >= data.nbHits) {
			$scope.finished = true;
			$rootScope.hideFooter = false;
		}
	};

	var getBroadcastThumb = function(user, backup) {
		// if(!user.broadcastId && user.objectID) {
		//     user.broadcastId = user.objectID;
		// }
		var thumb;
		if (user.broadcastId && config.settings.UseBroadcastThumbs) {
			thumb = Api.generateDynamicApi('BROADCAST_THUMB_DYNAMIC') + '/' + user.broadcastId + '/' + user.broadcastId + '.jpg';
			//thumb = config.settings.ServerCDNBaseUrl + "/php/api/getBroadcastThumb/broadcastId=" + user.broadcastId;
			if (backup) {
				//thumb = config.settings.apiMap.BROADCAST_THUMB+'/'+user.broadcastId+'/'+user.broadcastId+'.jpg';
				thumb = config.settings.ServerCDNBaseUrl + "/php/api/getBroadcastThumb/broadcastId=" + user.broadcastId;
			}
		} else if (user.tag && user.tag.length > 0 && user.userId && config.settings.UseBroadcastThumbs) {
			thumb = config.settings.ServerCDNBaseUrl + "/php/api/getBroadcastThumb/userId=" + user.userId;
		} else {
			thumb = config.settings.ServerCDNBaseUrl + "/php/api/channel/getImage/channelId=" + user.userId;
		}
		return thumb;
	};

	// Show broadcast preview or profile summary when clicked on
	$scope.selectUser = function(user, initial, instant) {
		if ($scope.selectingUser && user==$scope.selectingUser) {
			return false; // prevent duplicate call
		}
		$scope.selectingUser = user;

		if (!$window.jwplayer) {
			$timeout(function() {
				$scope.selectUser(user, initial);
			}, 1000);
			return false;
		}

		if (user && user.tag) {
			var curId = broadcasterService.exploreBroadcaster && broadcasterService.exploreBroadcaster.userId ? broadcasterService.exploreBroadcaster.userId : 0;
			Api.get('broadcast/info', {
				channelId: user.userId,
				curId: curId
			}).success(function(data) {
				$scope.selectingUser = false;
				if (data.user === undefined || data.user === null) {
					if (!initial) {
						$scope.showProfileSummary(user.userId);
					}
					return false;
				}
				data.user.displayName = Api.fullName(data.user);
				$scope.broadcast = data;
				if (instant) {
					$scope.showBroadcast();
					return false;
				}
				$scope.showMiniplayer = true;
				var stream_url = 'rtmp://' + data.media.host + data.media.app + '/' + data.media.stream;
				// Player is setup fresh each time, in order to show loading image
				if (!window.isPrerender) {
					$timeout(function() {
						if (jwplayer('playeroniBsrErLcZk').setup) {
							jwplayer('playeroniBsrErLcZk').setup({
								file: stream_url,
								image: config.settings.ServerCDNBaseUrl + '/images/back_webvideo_loading.jpg',
								width: '300',
								height: '225',
								autostart: true,
								autoplay: true,
								controls: false,
								aspectratio: '4:3',
								primary: 'flash',
								flashplayer: 'js/jwplayer6.7/jwplayer.flash.swf'
							});
							setVolume();
							jwplayer('playeroniBsrErLcZk').onDisplayClick(function() {
								$scope.showBroadcast();
							});
						}
					});
				}
				broadcasterService.exploreBroadcaster = $scope.broadcast;

				trackBroadcast();
			},function(){
				$scope.selectingUser = false;
			});
		} else {
			trackBroadcast();

			if (!initial && user) {
				$scope.showProfileSummary(user.userId);
			}
		}

	};

	var trackBroadcast = function() {
		// ignore first load - carry over the channelSwitch==START - because explore page reloads after coming from homepage as new user, and i can't figure out why!
		if (window.YouNow.broadcasterServiceChannelSwitch == 'START') { // after page refresh, now its ok to track
			broadcasterService.channelSwitch = 'START';
			window.YouNow.broadcasterServiceChannelSwitch = undefined;
		} else if (broadcasterService.channelSwitch == 'START' && (!$stateParams.tag || !$stateParams.tag.length)) { // page refresh if coming from homepage to "/explore" no tags
			window.YouNow.broadcasterServiceChannelSwitch = 'START';
			broadcasterService.viewtimeSeconds = 0;
			return false;
		}

		// BC = beforeChange = .broadcaster || .channel || .exploreBroadcaster
		eventbus.notifySubscribers('broadcaster:beforeChange', {});
		broadcasterService.exploreBroadcaster = broadcasterService.channelFormat(broadcasterService.exploreBroadcaster);
		broadcasterService.updateBc(broadcasterService.exploreBroadcaster);

		if ($stateParams.tag && $stateParams.tag.length > 0) {
			broadcasterService.channelSwitch = 'TAG';
		} else {
			broadcasterService.channelSwitch = 'EXPLORE';
		}
	};

	$scope.showProfileSummary = function(id) {
		$modal.profileSummary(id);
	};

	var setVolume = function() {
		jwplayer('playeroniBsrErLcZk').setVolume(swf.volume);
	};

	var getVips = function() {
		Api.get('younow/vips', {
			locale: config.UILocale
		}, true).then(function(response) {
			if (response.data.users && response.data.users.length > 0) {
				for (var user in response.data.users) {
					if (window.location.protocol === 'https:' && response.data.users[user].thumbnail.indexOf('https') === -1) {
						response.data.users[user].thumbnail = response.data.users[user].thumbnail.replace("http", "https");
					}
				}
				$scope.vips = {
					list: response.data.users
				};
			}
		});
	};

	var getEps = function(tag) {
		Api.get('younow/featuredOnTopicUsers', {
			locale: config.UILocale,
			tag: tag
		}, true).then(function(response) {
			$scope.eps = {
				list: response.data.featuredUsers
			};
		});
	};

	$scope.showTag = function(event, tag) {
		trackingPixel.trackClick('TAG', {
			field1: 'EXPLORE'
		});
		event.stopPropagation();
		$state.go($state.current, {
			tag: tag,
			q: undefined
		}, {
			reload: true
		});
		$rootScope.gaEvent('Conversion', 'Click Tag', trackingPixel.getUserLocation() || 'ANCILLARY');
	};

	$scope.showBroadcast = function() {
		broadcasterService.channelSwitch = "EXPLORE";
		broadcasterService.updateBroadcaster($scope.broadcast);
		broadcasterService.showBroadcaster();
	};

	$scope.trackBroadcaster = function() {
		trackingPixel.trackClick('BROADCASTER');
	};

	$scope.expandInfiniteBroadcasters = function(id, threshold) {
		var el = document.getElementById(id);
		el.height = el.height + (threshold || 100);
	};

	//clean up
	$scope.$on('$destroy', function() {
		eventbus.notifySubscribers('broadcast:end', $scope.broadcast);
		if ($rootScope.banners && $rootScope.banners.sticky && $rootScope.banners.sticky.active) {
			Api.closeTopBanner($rootScope.banners.sticky.group);
		}
	});

})

.directive("topBroadcastersHeight", function($window) {
	return function(scope, element, attrs) {
		angular.element($window).on("scroll", function() {
			element[0].style['max-height'] = 'calc(100vh + ' + this.pageYOffset + 'px - 400px)';
		});
		scope.$on('$destroy', function() {
			angular.element($window).off("scroll");
		});
	};
})

;
