angular.module('younow.channel', [
	'younow.channel.chat',
	'younow.channel.share-panel',
	'younow.channel.settingupPanel',
	'younow.channel.audience-panel',
	'younow.channel.guest-panel',
	'younow.channel.player-header',
	'younow.channel.player-footer',
	'younow.channel.player-overlay',
	'younow.channel.mini-overlay',
	'younow.channel.selfies-overlay',
	'younow.channel.end-of-broadcast',
	'younow.channel.selfie-view'
])

/**
 * Channel is split into two states
 * The first sets up the view. It is only run once.
 * The second parses the URL and handles. It is run each time the URL changes.
 * This enables fast switching between broadcasts without reloading the page.
 */

.config(["$stateProvider", function config($stateProvider) {
	$stateProvider
		.state('main.channel', {
			abstract: true,
			controller: 'ChannelCtrl',
			templateUrl: 'angularjsapp/src/app/states/main/channel/channel.tpl.html'
		})
		.state('main.channel.detail', {
			url: '/:profileUrlString/:entityId/:inviteString/:srcId/:entityType/:copy',
			params: {
				profileUrlString: {
					value: null,
					squash: true
				},
				entityId: {
					value: null,
					squash: true
				},
				inviteString: {
					value: null,
					squash: true
				},
				srcId: {
					value: null,
					squash: true
				},
				entityType: {
					value: null,
					squash: true
				},
				copy: {
					value: null,
					squash: true
				}
			},
			controller: 'ChannelDetailCtrl',
			template: '<div data-ui-view></div>'
		});
}])

.controller('ChannelCtrl', function HomeController($scope, $rootScope, $stateParams, $window, $sce, $modal, $timeout, broadcasterService, $location, $http, swf, config, Api, session, pusher, upload, $interpolate, trackingPixel, eventbus, webRtc, guestService, externalStreamer, $interval, $translate) {

	$scope.broadcasterService = broadcasterService;
	$scope.swf = swf;
	$scope.session = session;
	$scope.config = config;
	$scope.host = $window.location.host;
	$scope.Api = Api;
	$scope.globalVars = window.globalVars;

	$scope.comment = {};
	$scope.newPosts = {};

	//to prevent XSS attacks from being spoofed we should cache the old value and check against it later
	var contextBeforeCreate;

	$scope.show_noflash_message = false;
	$timeout(function() {
		if (swf.broadcast && swf.broadcast.allowGuestCallers != "1") {
			$scope.show_noflash_message = true;
		}
	}, 3300);

	$scope.timestamp = Date.now();

	$scope.uploadedImageRefresh = Api.store('uploadedImageRefresh') || '';
	if ($scope.uploadedImageRefresh) {
		Api.store('uploadedImageRefresh', null);
	}

	$window.onbeforeunload = function() {
		eventbus.notifySubscribers('broadcaster:beforeChange', {
			source: 'channel.js'
		});
		broadcasterService.bc = {};
		if (swf.currentSession.isBroadcasting) {
			$rootScope.gaEvent('CLOSED_BROWSER', 'BROADCASTER', config.UILocale);
		} else {
			$rootScope.gaEvent('CLOSED_BROWSER', 'VIEWER', config.UILocale);
		}
	};

	// fullscreen mode - resize
	var fullScreenResize = function() {
		// old flash player
		if ((window.innerHeight / window.innerWidth) < 0.75) {
			$scope.fullscreenAspect = 'wide';
		} else {
			$scope.fullscreenAspect = 'tall';
		}
	};
	fullScreenResize();
	angular.element($window).on("resize", function() {
		fullScreenResize();
	});

	$scope.showProfileSummary = function(id, state, network, params) {
		id = id || broadcasterService.broadcaster.userId;
		params = (typeof params == 'object') ? params : {};
		// following
		if (state == 'following') {
			if (network) {
				params.network = network;
			} else {
				return false;
			}
		}
		// flagging
		if ((state == 'following' || params.isFlagging) && !session.loggedIn) {
			$modal.loginModal('', 'REPORT').result.then(function(response) {
				$modal.profileSummary(id, params, state);
			});
		} else {
			$modal.profileSummary(id, params, state);
		}
	};


	$scope.tabClick = function(tab) {
		$rootScope.gaPage({
			page: $location.path() + "#" + tab
		});
	};

	$scope.showTab = function(tab) {
		// Set the tab
		broadcasterService.tab = tab;
		// Hide the footer
		if (!broadcasterService.channel || (broadcasterService.channel.finished && !broadcasterService.channel.finished[tab])) {
			$rootScope.hideFooter = true;
		}
		// Fetch items if empty
		if (!$scope.settingUp && broadcasterService.channel && (broadcasterService.channel.finished && !broadcasterService.channel.finished[tab]) && (!broadcasterService.channel[tab] || broadcasterService.channel[tab].length < 2)) {
			$scope.settingUp = true;
			broadcasterService.getItems(tab).then(function() {
				$scope.settingUp = false;
			});
		}
	};

	$scope.fullName = function(user) {
		return Api.fullName(user);
	};
	$scope.showMedia = function(id, params, broadcast) {
		$modal.mediaPlayerModal(id, params, broadcast);
	};
	$scope.openUrl = function(url) {
		$window.open(url, '_blank');
	};

	$scope.socialMediaHandler = function(url, isConnected) {
		if (!isConnected && isConnected !== undefined) {
			$location.url('settings#accounts');
		} else {
			$scope.openUrl(url);
		}
	};

	$scope.doUpload = function(uploadFile, endpoint, name) {
		// check size
		var el = angular.element(uploadFile);
		var url = window.URL.createObjectURL(el[0].files[0]);
		var img = new window.Image();
		img.src = url;

		if (window.URL) {
			img.onload = function() {
				// too small
				if (img.width < 80 || img.height < 80) {
					Api.triggerTooltip(el, 40000);
					return false;
				}
				// continue
				continueUpload(el, endpoint, name);
			};
		} else {
			// continue
			continueUpload(el, endpoint, name);
		}

		// continue
		var continueUpload = function(el, endpoint, name) {
			// too big ?
			if ((el[0].files[0].size / 1000000) > 6) {
				Api.triggerTooltip(el);
				return false;
			}
			// good !
			var data = {
				userId: session.user.userId,
				channelId: broadcasterService.channel.userId
			};

			data[name] = el;
			var apiData = {
				url: window.location.protocol + '//' + config.host + '/php/api/channel/' + endpoint,
				method: 'POST',
				data: data
			};
			if (session && session.user) {
				apiData.headers = {
					'X-Requested-By': session.user.requestBy
				};
			}
			upload(apiData).then(function(response) {
				$scope.uploadedImageRefresh = '?' + Math.random();
				Api.store('uploadedImageRefresh', '?=' + Math.random());
			});

		};
	};

	$scope.editProfile = function() {
		broadcasterService.channel.editingProfile = true;
	};
	$scope.cancelEdit = function() {
		broadcasterService.channel.editingProfile = false;
	};
	$scope.saveEdit = function() {
		broadcasterService.channel.editingProfile = false;
	};


	$scope.saveDescription = function() {
		broadcasterService.channel.description = Api.stripHTML(broadcasterService.channel.description);
		broadcasterService.channel.displayDescription = Api.convertEmoji(Api.prepareDescription(broadcasterService.channel.description));
		broadcasterService.channel.editingProfile = false;
		Api.post('channel/editBio', {
			userId: session.user.userId,
			channelId: broadcasterService.channel.userId,
			bio: broadcasterService.channel.description
		});
	};


	$scope.showUploadPreview = function(event, container) {
		var files = event.target.files;
		// container.upload = files[0];
		$scope.readFile(files[0], container);
		container.fileName = files[0].name;

		//add the file the global object to keep track and retrieve files we have access to
		window.uploadedImage = files[0];
	};

	$scope.readFile = function(file, container) {
		var reader = new window.FileReader();
		reader.onload = function(e) {
			$scope.$evalAsync(function() {
				container.preview = e.target.result;
			});
		};
		reader.readAsDataURL(file);
	};

	$scope.postComment = function(context) {
		if (!context.upload && context.fileName) {
			context.upload = window.uploadedImage;
		}

		// Busy trap
		if ($scope.posting) {
			return false;
		}

		// Empty trap
		if (!context || (!context.html && !context.upload)) {
			return false;
		}

		// Login trap
		if (!session.loggedIn) {
			if (context.id) {
				$modal.loginModal('', 'POST_COMMENT').result.then(function() {
					$scope.postComment(context); // Try again after success
				});
			} else {
				$modal.loginModal('', 'POST').result.then(function() {
					$scope.postComment(context); // Try again after success
				});
			}
			return false;
		}

		// Fan trap
		if (!session.fanStatus[broadcasterService.channel.userId] && broadcasterService.channel.userId !== session.user.userId) {
			$modal.trap('fan', broadcasterService.channel, 'PROFILE', function() {
				$scope.postComment(context);
			});
			return false;
		}

		$scope.posting = true;

		// If no text (image only), post immediately
		if (!context.html) {
			uploadComment(context);
			return true;
		}

		// Extract mentions
		context = extractMentions(context);

		// Strip HTML
		var html = angular.element(document.getElementById('textarea_' + (context.id || '')));
		var text = angular.element("<p>" + html.text() + "</p>").text(); // Strip pasted & written html
		context.comment = text; // Set plain text comment to be used in post
		html.empty(); // Clear the original input to indicate to user that we are posting
		context.html = '';

		// If an image is being uploaded, post immediately
		if (context.upload) {
			uploadComment(context);
			return true;
		}

		// Check for links in the post
		var links = Api.findLinks(context.comment);

		// If no links found, post immediately
		if (!links || !links[0]) {
			uploadComment(context);
			return true;
		}

		// Otherwise, check links on embedly
		// check against a white list
		if (!links[0].match(Api.regexStore.embedlyWhiteList)) {
			uploadComment(context);
			return false;
		}
		var embedlykey = 'd4272e7f48454b81849810f8d9258198';
		var escapedUrl = encodeURIComponent(links[0].replace(/("|').*$/g, ''));
		var embedlyRequest = window.location.protocol + '//api.embed.ly/1/oembed?key=' + embedlykey + '&chars=250&maxwidth=433&frame=true&url=' + escapedUrl;
		contextBeforeCreate = context;
		$http.get(embedlyRequest)
			// If embed found, format it and then post
			.success(function(response) {
				if (response.type === 'photo') {
					var photoTemplate = '<div><img src="{{url}}"></div>';
					response.html = $interpolate(photoTemplate)(response);
				}
				if (response.type === 'link') {
					var linkTemplate = '<div><a href="{{url}}" rel="nofollow" target="_blank"><div class="embedly-link-container"><div class="left pull-left"><img src="{{thumbnail_url}}" /></div><div class="right pull-left"><div class="title"><span>{{title}}</span></div><div class="description"><span>{{description}}</span></div></div><div class="clear"></div></div></a></div>';
					response.html = $interpolate(linkTemplate)(response);
				}
				if (response.html) {
					context.comment += response.html;
					delete response.html;
				}
				context.embedly = response;
				uploadComment(context);
			})
			// If no embed found, just post the comment as is
			.error(function(response) {
				uploadComment(context);
			});

	};

	var uploadComment = function(context) {
		var data = {
			post: context.comment || '',
			parentId: (context.id || 0),
			channelId: broadcasterService.channel.userId,
			userId: session.user.userId,
			doEnrich: 1,
			tsi: Api.store('trpxId'),
			tdi: Api.store('trpx_device_id')
		};
		if (context.embedly) {
			if (context.embedly.provider_url != contextBeforeCreate.embedly.provider_url && !context.embedly.provider_url.match(Api.regexStore.embedlyWhiteList)) {
				$scope.posting = false;
				Api.showError({
					errorCode: 'x',
					errorMsg: "The was a problem posting your comment."
				}); // Generate a fake error, in lieu of one from the server
				context.comment = '';
				$scope.removeUpload(context);
				return false;
			}
			data.embedly = JSON.stringify(context.embedly);
		}
		if (context.upload) {
			data.media = context.upload;
		}
		if (context.mentions) {
			data.mentioned = context.mentions.join(',');
		}

		var apiData = {
			url: window.location.protocol + '//' + config.host + '/php/api/post/create',
			method: 'POST',
			data: data
		};

		if (session && session.user) {
			apiData.headers = {
				'X-Requested-By': session.user.requestBy
			};
		}

		upload(apiData).then(function(response) {
			if (response.data.errorMsg) {
				Api.showError(response.data);
			} else if (response.data.id) {
				$scope.newPosts[response.data.id] = response.data;
			} else {
				Api.showError({
					errorCode: 'x',
					errorMsg: "The was a problem posting your comment."
				}); // Generate a fake error, in lieu of one from the server
			}
			$scope.posting = false;
		});
		context.comment = '';
		$scope.removeUpload(context);
	};

	$scope.submitOnEnter = function(event, comment) {
		if (event.keyCode == 13 && !$scope.people) { // If enter and not current @mentioning
			$scope.postComment(comment);
			event.preventDefault();
		}
	};

	$scope.removeUpload = function(context) {
		var id = "file_" + (context.id || '');
		var file = angular.element(document.getElementById(id));
		file.replaceWith(file.val('').clone(true));
		delete window.uploadedImage;
		delete context.preview;
		delete context.upload;
	};


	$scope.canEdit = function(post, action) {
		if (!session.user || !session.user.userId) {
			return false;
		}
		if (session.isMod() || broadcasterService.channel.userId === session.user.userId) {
			return true;
		}
		if (post.user.userId == session.user.userId || $scope.newPosts[post.id]) {
			return true;
		}
		return false;
	};

	$scope.canPin = function(post) {
		if (!session.user || !session.user.userId) {
			return false;
		}
		if (session.isMod() || broadcasterService.channel.userId === session.user.userId) {
			if (!post.parentId) {
				return true;
			}
		}
		return false;
	};

	$scope.searchPeople = function(term) {
		Api.algolia(term).success(function(data) {
			angular.forEach(data.hits, function(user, i) {
				user.displayName = Api.fullName(user);
				user.thumb = $scope.cdn.thumb + user.objectID;
			});
			$scope.people = data.hits;
		});
	};
	$scope.insertMention = function(item) {
		$scope.people = undefined;
		return '<span class="mention-highlight" contenteditable="false" person="' + item.objectID + '">' + item.displayName + '</span>';
	};
	var extractMentions = function(context) {
		var textarea = document.getElementById('textarea_' + (context.id || ''));
		var spans = textarea.getElementsByClassName('mention-highlight');
		if (spans.length) {
			context.mentions = [];
			angular.forEach(spans, function(span) {
				var mention = angular.element(span);
				context.mentions.push(mention.text() + ':' + mention.attr('person'));
				mention.text('@' + mention.text());
			});
		}
		return context;
	};

	$scope.enterLiveChat = function() {
		broadcasterService.channelSwitch = "PROFILE";
		broadcasterService.switchAsync(false);
	};

	$scope.goIfNotBroadcasting = function(callback, params) {
		if (session.isBroadcasting || (guestService.guest && guestService.guest.userId == session.user.userId)) {
			session.preventBroadcastInterrupt();
		} else if (broadcasterService.broadcaster && params === broadcasterService.broadcaster.userId) {
			return false;
		} else {
			callback(params);
		}
	};

	$scope.trackBroadcaster = function() {
		trackingPixel.trackClick('BROADCASTER');
	};

	$scope.adclick = function(campaign) {
		$rootScope.gaEvent('FEATURE', campaign, config.UILocale);
	};

	$scope.invalidCamera = function() {
		//this is only for setting up your broadcast
		if (!swf.settingUpBroadcast) {
			return false;
		}
		var camera = webRtc.getCurrentConfig().webrtcStream;
		if (camera.getVideoTracks && Api.browser.name == 'Chrome') {
			camera = camera.getVideoTracks();
			if (camera[0].label && camera[0].label.indexOf('ManyCam') !== -1) {
				$modal.alert('We weren’t able to detect your camera. Please check your browser settings. Note that ManyCam currently only works on <a href="https://www.mozilla.org/en-US/firefox/new/" target="_blank">FireFox</a> for Mac.');
			} else {
				$modal.alert('We weren’t able to detect your camera. Please check your browser settings.');
			}
		} else {
			$modal.alert('We weren’t able to detect your camera. Please check your browser settings.');
		}
	};

	//technicall having no camera is considered 'valid', we have to make sure that this user has a camera
	$scope.validCamera = function() {
		//this is only for setting up your broadcast
		if (!swf.settingUpBroadcast) {
			return false;
		}
		var cameraExists = webRtc.checkIfCameraExists();
		if (!cameraExists) {
			$modal.alert('We weren’t able to detect your camera. Please check your browser settings.');
		}
	};

	//rendering methods
	$scope.isViewer = function() {
		return (guestService.state == 'ready' && !swf.settingUpBroadcast && !session.isBroadcasting);
	};

	$scope.isFlashBroadcast = function() {
		return (!config.mcu && (swf.settingUpBroadcast || session.isBroadcasting));
	};

	$scope.isWebrtcBroadcast = function() {
		return config.mcu && !externalStreamer.settings.active && !externalStreamer.settings.streaming && (swf.settingUpBroadcast || session.isBroadcasting || guestService.state != 'ready');
	};


	//clean up presence channel & public channel when leaving the state
	$scope.$on('$destroy', function() {
		pusher.unsubscribe('publicChannel');
		pusher.unsubscribe('presenceChannel');
		$window.onbeforeunload = null;
		angular.element($window).off('resize');
	});

	$scope.guestService = guestService;
	$scope.externalStreaming = externalStreamer.settings;	

})

.directive('uploadProfileImage', function($rootScope) {
	return {
		restrict: 'A',
		scope: {
			uploadEndpoint: '@',
			uploadName: '@',
			doUpload: '&'
		},
		link: function(scope, elem, attr, ctrl) {
			elem.bind('change', function(event) {
				scope.doUpload()(elem, scope.uploadEndpoint, scope.uploadName);
			});
		}
	};
})

.controller('ChannelDetailCtrl', function(Api, $rootScope, $scope, $http, $state, $location, $stateParams, $timeout, config, broadcasterService, swf, ab, eventbus, session, trackingPixel, $modal, $interval) {
	//clean up the banners on a change
	if ($rootScope.banners && $rootScope.banners.sticky && $rootScope.banners.sticky.active) {
		Api.closeTopBanner($rootScope.banners.sticky.group);
	}

	// This controller runs every time the URL switches and handles accordingly
	// However, ignore if the change was triggered interally by the channel service
	if (!broadcasterService.internalUpdate) {
		// Check if async should be shown
		var async = $stateParams.entityId ? true : false;
		var uri = $location.search();
		if (uri.from) {
			broadcasterService.channelSwitch = uri.from.toUpperCase();
		}

		// Track
		if (async) {
			$rootScope.gaPage({
				page: 'Profile'
			});
		}

		// Load a featured broadcaster if none set
		if (!$stateParams.profileUrlString) {
			if (!broadcasterService.channelSwitch) {
				broadcasterService.channelSwitch = "START";
			}
			// if (Api.store('hideYounowLanding')!=='true') {
			// $state.go('home');
			// } else {
			broadcasterService.featuredBroadcaster();
			// }
			return false;
		} else {
			if (!broadcasterService.channelSwitch) {
				broadcasterService.channelSwitch = "LINK";
			}
		}

		// If the profile string is new, set the broadcaster via URL
		if (!broadcasterService.broadcaster || broadcasterService.broadcaster.profile !== $stateParams.profileUrlString) {
			// TODO: Clear the old broadcaster, without destroying flash
			broadcasterService.switchBroadcaster($stateParams.profileUrlString, true, async);

			// Otherwise, do a quick switch
		} else {
			broadcasterService.switchAsync(async);
		}

	} else {
		// Comes through here when coming from homepage (domain, no url), then redirects above
		if (!broadcasterService.channelSwitch) {
			broadcasterService.channelSwitch = "START";
		}
		// Clear the internal update flag
		broadcasterService.internalUpdate = false;
	}
	config.init.then(function() {
		var variant = ab.variant('WEB_PROFILE_TABS');
		broadcasterService.setTab(variant);
	});

});
