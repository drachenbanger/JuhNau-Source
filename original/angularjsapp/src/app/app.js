// global
if (window.globalVars && window.globalVars.pageLanguage == 'me') {
	window.globalVars.pageLanguage = 'ar';
}
if (!window.YouNow) {
	window.YouNow = {};
}
window.YouNow.track = {};
window.YouNow.ReactComponents = {};
String.prototype.capitalize = function() { // ok for production, very useful!
	return this.toLowerCase().replace(/(?:^|\s)\S/g, function(a) {
		return a.toUpperCase();
	});
};
window.YouNow.captureError = function() {};
if (!window.reset) {
	window.reset = function() {
		window.localStorage.clear();

		var c = window.document.cookie.split("; ");
		for (var i in c) {
			window.document.cookie = /^[^=]+/.exec(c[i])[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
		}

		window.location.reload(true);
		return 'cleared cache and cookies and localStorage... reloading...';
	};
} else {
	console.warn('window.reset() already defined');
}
if (!window.readCookie) {
	window.readCookie = function(name, c, C, i) {
		if (window.localStorate) {
			return window.localStorage.getItem(name);
		}
		if (window.readCookies) {
			return window.readCookies[name];
		}
		c = window.document.cookie.split('; ');
		window.readCookies = {};
		for (i = c.length - 1; i >= 0; i--) {
			C = c[i].split('=');
			window.readCookies[C[0]] = C[1];
		}
		return window.readCookies[name];
	};
}
if (!window.createCookie) {
	window.createCookie = function(name, value, days) {
		if (window.localStorate) {
			return window.localStorage.setItem(name, value);
		}
		var expires;
		if (days) {
			var date = new Date();
			date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
			expires = "; expires=" + date.toGMTString();
		} else {
			expires = "";
		}
		document.cookie = name + "=" + value + expires + "; path=/";
	};
}
// LANGUAGE
// set here so can be accessed anytime, before config-service controller is run
window.YouNow.UILanguages = {
	'en': 'English',
	'de': 'Deutsch',
	'ar': 'العربية',
	'tr': 'Türkçe',
	'es': 'Español',
	'fr': 'Français',
	'pt': 'Português',
	'id': 'Indonesia'
};
window.YouNow.UILanguageRegex = '';
for (var la in window.YouNow.UILanguages) {
	window.YouNow.UILanguageRegex += '/'+la+'|';
}
window.YouNow.UILanguageRegex += '/';

// angular
angular.module('younow', [
	'templates',
	'younow.content-creator',
	'younow.core',
	'younow.directives',
	'younow.partner',
	'younow.jobs',
	'younow.info',
	'younow.policy',
	'younow.home',
	'younow.about',
	'younow.gettheapp',
	'younow.lockout',
	'younow.main',
	'younow.missing',
	'younow.mention',
	'younow.post',
	'younow.reply',
	'younow.fan-button',
	'younow.guest-button',
	'younow.subscribe-button',
	'younow.seach-bar',
	'younow.user-badge',
	'younow.stripe',
	'younow.miniPlayer',
	'younow.modals.alert',
	'younow.modals.vip',
	'younow.modals.confirm',
	'younow.modals.iframe',
	'younow.modals.login',
	'younow.modals.gate',
	'younow.modals.media-player-modal',
	'younow.modals.media-player-modal-exp',
	'younow.modals.partner',
	'younow.modals.partner-agreement',
	'younow.modals.profile-summary',
	'younow.modals.subscribe-modal',
	'younow.modals.trap',
	'younow.modals.youtube-subscribe',
	'younow.modals.share-broadcast-modal',
	'younow.modals.buybars',
	'younow.modals.verification',
	'younow.modals.ep',
	'younow.modals.mobile-download',
	'younow.modals.spending-redirect',
	'younow.modals.reconnect-modal',
	'younow.services.ab',
	'younow.services.channel',
	'younow.services.config',
	'younow.services.dashboard',
	'younow.services.search',
	'younow.services.session',
	'younow.services.pusher',
	'younow.services.swf',
	'younow.services.utils',
	'younow.services.tracking-pixel',
	'younow.services.trpx',
	'younow.services.shareService',
	'younow.services.eventbus',
	'younow.services.debugger',
	'younow.services.web-rtc',
	'younow.services.guest-service',
	'younow.services.external-streamer',
	'younow.services.selfies',
	'younow.services.webpush',
	'ui.router',
	'ui.bootstrap',
	'pascalprecht.translate',
	'lr.upload',
	'angular-embedly',
	'duScroll',
	'mentio',
	'zeroclipboard',
	'react',
	'dcbImgFallback'
])

.value('duScrollGreedy', true)

.config(["$httpProvider", "$compileProvider", "$locationProvider", "$urlRouterProvider", "$sceDelegateProvider", "$translateProvider", "embedlyServiceProvider", "uiZeroclipConfigProvider", "$tooltipProvider", function myAppConfig($httpProvider, $compileProvider, $locationProvider, $urlRouterProvider, $sceDelegateProvider, $translateProvider, embedlyServiceProvider, uiZeroclipConfigProvider, $tooltipProvider) {

	$sceDelegateProvider.resourceUrlWhitelist(['self', '**']);

	$urlRouterProvider.otherwise('/');

	$locationProvider.html5Mode(true);

	$translateProvider.useSanitizeValueStrategy(null);
	$translateProvider.preferredLanguage('en').fallbackLanguage('en');
	$translateProvider.useStaticFilesLoader({
		prefix: window.globalVars.CDN_BASE_URL + '/angularjsapp/src/assets/i18n/',
		suffix: '.json?v=' + window.globalVars.JS_VERSION
	});

	embedlyServiceProvider.setKey('d4272e7f48454b81849810f8d9258198');

	// Enable CORS
	$httpProvider.defaults.useXDomain = true;
	delete $httpProvider.defaults.headers.common['X-Requested-With'];

	$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|data|javascript):/);
	if (window.location.search.indexOf('debugInfoEnabled') == -1 && !window.readCookie('debugInfoEnabled')) {
		$compileProvider.debugInfoEnabled(false);
	} else {
		window.createCookie('debugInfoEnabled', 'true');
	}

	uiZeroclipConfigProvider.setZcConf({
		swfPath: window.globalVars.CDN_BASE_URL + '/angularjsapp/vendor/bower/zeroclipboard/dist/ZeroClipboard.swf',
		cacheBust: false
	});

	//set up tooltips
	$tooltipProvider.setTriggers({
		'show': 'hide',
		'mouseenter': 'mouseleave click'
	});

	//tell the app if this is a prerender.io bot
	window.isPrerender = window.navigator.userAgent.indexOf('Prerender') !== -1 ? true : false;
}])

//exception handling
.config(["$provide", function($provide) {
	$provide.decorator("$exceptionHandler", ['$delegate', '$window', function($delegate, $window) {
		return function(exception, cause) {
			if ($window.bugsnagAdditionalParams && $window.Bugsnag) {
				$window.Bugsnag.metaData = {
					lastApiStack: $window.bugsnagAdditionalParams.lastApiStackObject,
					lastClickStack: $window.bugsnagAdditionalParams.lastClickStackObject
				};
			}
			if ($window.Bugsnag) {
				// capture
				var trpx_device_id = 0;
				try {
					trpx_device_id = window.localStorage.getItem('trpx_device_id');
				} catch (e) {
					trpx_device_id = window.readCookie('trpx_device_id');
				}
				if (!trpx_device_id) {
					window.YouNow.captureError(exception.name);
				}
				// snag
				$window.Bugsnag.notifyException('#INITIAL_ERROR: ' + exception);
			}
			$delegate(exception, cause);
		};
	}]);

	// ************************ Google Analytics ********************************//
	// Setup GA object
	window.ga = window.ga || function() {
		(ga.q = ga.q || []).push(arguments);
	};
	ga.l = +new Date();
	// Register site
	var gaKey = window.location.host === 'www.younow.com' ? "UA-24148895-1" : "UA-24148895-2";
	window.ga('create', gaKey, 'auto');
	// Support for demographics
	window.ga('require', 'displayfeatures');
	//setting up userId has been moved to session-service
}])

.config(function(configProvider) {
	configProvider.update();
})

.run(function(config, $q) {
	//stall the app to load critical things
	var deferred = $q.defer();
	config.deferred = deferred;
	config.init = deferred.promise;
})

.controller('AppCtrl', ["$window", "$document", "$location", "$rootScope", "$scope", "$state", "$stateParams", "$urlRouter", "$translate", "$modal", "$timeout", "$q", "config", "Api", "broadcasterService", "session", "pusher", "twitter", "swf", "trackingPixel", "debug", "eventbus", "guestService", "webpush", "dashboard", function AppCtrl($window, $document, $location, $rootScope, $scope, $state, $stateParams, $urlRouter, $translate, $modal, $timeout, $q, config, Api, broadcasterService, session, pusher, twitter, swf, trackingPixel, debug, eventbus, guestService, webpush, dashboard) {
	//Prerender Clientside Timeout (12 seconds)
	$timeout(function() {
		if (window.isPrerender) {
			window.prerenderReady = true;
		}
	}, 12000);

	//prerender redirect if there is no user
	$rootScope.httpStatus = window.isPrerender ? '200' : false;

	$window.bugsnagAdditionalParams = {
		lastApiStack: [],
		lastClickStack: [],
		lastApiStackObject: {},
		lastClickStackObject: {}
	};

	//setup bugsnag New user error logging
	window.YouNow.captureError = function(error) {
		trackingPixel.capture({
			event: 'INITIAL_ERROR',
			extradata: error.name,
			field1: Api.browser.name + '_' + Api.browser.version
		});
	};

	$rootScope.$watch(function() {
		return $rootScope.title;
	}, function(title) {
		if (title && !window.isPrerender) {
			$scope.pageTitle = title;
		}
	});

	// Page
	$rootScope.gaPage = function(tr) {
		var nonAncillary = ['home', 'explore', 'tag', 'profile', 'live broadcast', 'archived broadcast'];
		var ancillaryOnly = ['about', 'info', 'policy', 'jobs'];
		// params
		tr = (typeof tr == 'object') ? tr : {};
		// path
		tr.path = tr.path || window.location.pathname;
		if (tr.path !== $rootScope.previousPath) {
			$rootScope.previousPath = tr.path;
			window.ga('set', 'page', tr.path);
		}
		if (!tr.pageType) {
			tr.pageType = (trackingPixel.getUserLocation() || 'ANCILLARY').toLowerCase();
		}
		if (tr.pageType === 'brdcst') {
			tr.pageType = 'live broadcast';
		}
		tr.linkType = config.linkType;
		if (!window.YouNow.track.pageFirst && !window.waitForPageType) {
			if (tr.pageType && nonAncillary.indexOf(tr.pageType) === -1) {
				if (ancillaryOnly.indexOf(tr.pageType) === -1) {
					window.YouNow.track.pageFirst = 'other';
					return false;
				}
				tr.pageType = 'ancillary';
			}
			setDimensions(tr);
			$rootScope.gaEvent('LANDING', tr.pageType);
			window.YouNow.track.pageFirst = tr.pageType;
			// done
			debug.console(['GA', 'PAGE'], tr);
			window.ga('send', 'pageview');
		}
	};

	// Event
	$rootScope.gaEvent = function(category, action, label, value, extraFields) {
		var fields = {
			'hitType': 'event',
			'eventCategory': category,
			'eventAction': action
		};
		if (label) {
			fields.eventLabel = label;
		}
		if (value) {
			fields.eventValue = value;
		}
		if (extraFields) {
			fields = angular.extend(fields, extraFields);
		}
		// done
		debug.console(['GA', 'EVENT', category.toUpperCase()], {
			category: category,
			action: action,
			label: label,
			value: value,
			extraFields: extraFields
		});
		window.ga('send', fields);
	};

	function setDimensions(tr) {
		//link type
		window.ga('set', 'contentGroup3', tr.linkType);
		window.ga('set', 'dimension4', tr.linkType);
		debug.console(['GA', 'DIMENSION'], {
			linkType: tr.linkType,
			contentGroup: 'contentGroup3',
			dimensionGroup: 'dimension4'
		});


		//page type
		window.ga('set', 'contentGroup1', tr.pageType);
		window.ga('set', 'dimension1', tr.pageType);
		debug.console(['GA', 'DIMENSION'], {
			pageType: tr.pageType,
			contentGroup: 'contentGroup1',
			dimensionGroup: 'dimension1'
		});

		//page type
		window.ga('set', 'contentGroup4', tr.linkType + ' >> ' + tr.pageType);
		window.ga('set', 'dimension5', tr.linkType + ' >> ' + tr.pageType);
		debug.console(['GA', 'DIMENSION'], {
			pageType: tr.linkType + ' >> ' + tr.pageType,
			contentGroup: 'contentGroup4',
			dimensionGroup: 'dimension5'
		});

		window.contentSet = true;
	}

	$scope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {

		// Set temp language
		if (window.globalVars.pageLanguage && window.isPrerender) {
			config.setTempLanguage(window.globalVars.pageLanguage);
			window.globalVars.pageLanguage = null;
		} else {			
			config.keepTempLanguage = false;
		}

		$rootScope.fromState = fromState;
		// track empty broadcaster
		if (toState.name.indexOf('explore') !== -1 || toState.name.indexOf('channel') !== -1) {
			// explore and channel already track broadcaster
		} else {
			// set broadcaster
			eventbus.notifySubscribers('broadcaster:beforeChange', {});
			broadcasterService.updateBc({});
		}
		//generate a linkType and put it into the config
		if (!config.linkType) {
			var path = window.location.pathname;
			var ancillary = ["about", "info", "policy"];
			if (path.indexOf('/jobs') !== -1) {
				config.linkType = 'ancillary';
			} else if (ancillary.indexOf(path.split('/')[1]) !== -1) {
				config.linkType = 'ancillary';
			} else if (path === '/') {
				config.linkType = 'home';
			} else if (/^['/en|/de|/ar|/tr|/es|/fr|/pt|/ms|/id|/nl|/ru|/ja|/ko|/hi|/th']{2}\/?$/i.test(path)) { // now, how to use a variable window.YouNow.UILanguageRegex inside regex??
				config.linkType = 'home';
			} else if (path.indexOf('/explore') !== -1 && path[9] !== undefined) {
				config.linkType = 'tag';
			} else if (path.indexOf('/explore') !== -1) {
				config.linkType = 'explore';
			} else if (path.match(/\//g).length > 2) {
				config.linkType = 'brdcst';
			} else {
				config.linkType = 'profile';
			}
			if (config.linkType === 'brdcst' || config.linkType === 'profile' || config.linkType === 'home') {
				window.waitForPageType = true;
			}
		}

		if (session.isBroadcasting) {
			//patch
			if ((toParams.profileUrlString !== session.user.profile || toParams.entityId)) {
				session.preventBroadcastInterrupt();
				event.preventDefault();
			}

			if (guestService.guest && guestService.guest.userId == session.user.userId) {
				guestService.preventGuestingInterrupt();
				event.preventDefault();
			}
		}

		// Lockout if failed age test within 24 hours
		if (!Api.store('younowOldEnough')) {
			var lockout = Api.store('younowAgeLockout');
			if (lockout && lockout !== "0" && toState.name != 'lockout') {
				if (Number(lockout) > (new Date().getTime() / 1000)) {
					event.preventDefault();
					$state.go('lockout');
				}
			}
		}

		/* ///////////////////////////////////////////////*/
		/* Create shortcuts by intercepting certain URLs  */
		/* ///////////////////////////////////////////////*/

		if (!session.isBroadcasting && toParams) {
			// profile/{id} > show profile summary
			if (toParams.profileUrlString === 'about') {
				$state.go('about');
				config.linkType = 'ancillary';
				event.preventDefault();
			}
			// profile/{id} > show profile summary
			if (toParams.profileUrlString === 'profile') {
				$modal.profileSummary(toParams.entityId);
				event.preventDefault();
			}
			// channel/{id} > switch to a channel
			if (toParams.profileUrlString === 'channel') {
				broadcasterService.channelSwitch = "PROFILE";
				broadcasterService.switchBroadcaster(toParams.entityId);
				event.preventDefault();
			}
			// channel/{id} > switch to a channel
			if (toParams.profileUrlString === 'broadcastid') {
				Api.get('broadcast/videoPath',{'broadcastId':toParams.entityId}).then(function(response){
					if(response.data.profileUrlString) { // archived
						$location.path('/'+response.data.profileUrlString+'/'+toParams.entityId+'/0/0/b');
					} else { // live
						broadcasterService.channelSwitch = "REDIRECT";
						broadcasterService.switchBroadcaster(response.data.userId);
					}
				});
				event.preventDefault();
			}
			// /featured or /tag/{tag} > show a featured user (tag optional)
			if (toParams.profileUrlString === 'featured' || toParams.profileUrlString === 'tag') {
				$rootScope.gaPage({
					path: '/featured/' + toParams.entityId
				});
				broadcasterService.featuredBroadcaster(toParams.entityId);
				event.preventDefault();
			}
		}

		$rootScope.hideFooter = false;
	});

	$scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
		$rootScope.fromState = fromState;

		// Clear temp language
		if (config.UILanguageOriginal) {
			if(!config.keepTempLanguage) {
				config.resetTempLanguage();			// Reset back to user preferred / detected
			} else {
				config.keepTempLanguage = false; 	// Clear for next state change
			}
		} 

		// On initial page load, set the referral data if it exists
		if (!session.referralData) {
			session.inviteString = $stateParams.inviteString || '';
			session.srcId = $stateParams.srcId || '';
			session.profileUrlString = toParams.profileUrlString;
			session.referralData = true;
		}

		// Start dashboard
		if((!dashboard.tags || !dashboard.users)) { // on home page, need to wait for locale
			dashboard.getTrending();
		}

		// track
		if (!window.YouNow.track.pageFirst) {
			$rootScope.gaPage();
		}
		// Scroll to the top of page
		$document.scrollTop(0);
		// Reset the page title
		$rootScope.title = $rootScope.newTitle || 'YouNow | Live Stream Video Chat | Free Apps on Web, iOS and Android';
		// Reset the 10 error Bugsnag limit
		if ($window.Bugsnag) {
			$window.Bugsnag.refresh();
		}
	});

	//setup the broadcasterThumb
	if (config.settings.UseBroadcastThumbs) {
		config.broadcasterThumb = config.settings.ServerCDNBaseUrl + "/php/api/getBroadcastThumb/broadcastId=";
	} else {
		config.broadcasterThumb = config.settings.ServerCDNBaseUrl + '/php/api/channel/getImage/channelId=';
	}
	// Look for a user session
	if (!window.isPrerender) {
		session.getSession().success(function(data) {
			config.deferred.resolve();
			// Age Gate
			$modal.ageGate().then(function() {
				// If no session found, attempt to silent auth
				if (data.userId === 0) {
					var silent = session.silentAuth();
					if (silent) {
						silent.catch(function(response) {
							session.forceLogin('REOPEN');
						});
					} else {
						if (session.profileUrlString) {
							session.forceLogin('LINK');
						} else {
							session.forceLogin('REOPEN');
						}
					}
				}
			});
			// Setup Pusher
			pusher.init();
		});
	} else {
		// No session user
		session.user = {'userId':0};
		config.deferred.resolve();
		pusher.init();
	}
	window.YouNow.loadingTime.younowReady = (Date.now() - window.YouNow.loadingTime.startTime);

	// Set base urls for easy use throughout the app
	$scope.cdn = {};
	$scope.local = {};
	$scope.local.base = config.settings.ServerLocalBaseUrl;
	$scope.cdn.base = config.settings.ServerCDNBaseUrl;
	$scope.cdn.image = config.settings.ServerCDNBaseUrl + '/images';
	$scope.cdn.thumb = config.settings.ServerCDNBaseUrl + '/php/api/channel/getImage/channelId=';
	$scope.cdn.nothumb = config.settings.ServerCDNBaseUrl + '/images/nothumb.jpg';
	$scope.cdn.broadcast = config.settings.ServerCDNBaseUrl + '/php/api/getBroadcastThumb/broadcastId=';
	$scope.cdn.snapshot = config.settings.ServerCDNBaseUrl + '/php/api/getSnapshot/id=';
	$scope.cdn.media = config.settings.ServerCDNBaseUrl + '/php/api/post/getMedia/channelId=';
	$scope.cdn.background = function(id, type, refresher) {
		type = type || 'Image';
		var extra = type == 'Image' ? ', url(' + $scope.cdn.nothumb + ')' : '';
		return 'background:url(' + $scope.cdn.channelImage(id, type, refresher) + ')' + extra + ' no-repeat center center; background-size: cover;';
	};
	$scope.cdn.channelImage = function(id, type, refresher) {
		type = type || 'Image';
		refresher = refresher || '';
		var base = session.user && session.user.userId == id ? config.settings.ServerLocalBaseUrl : config.settings.ServerCDNBaseUrl;
		return base + '/php/api/channel/get' + type + '/channelId=' + id + refresher;
	};


	// Setup Modals for easy re-use
	$modal.loginModal = function(hard, source, data) {
		//prevent opening if its prerendered
		if (window.isPrerender) {
			return false;
		}
		var modal = $modal.open({
			templateUrl: 'angularjsapp/src/app/components/login-modal/login-modal.tpl.html',
			controller: 'LoginModalCtrl',
			windowClass: 'social-login-modal',
			backdrop: hard ? 'static' : true,
			keyboard: hard ? false : true,
			resolve: {
				soft: function() {
					return !hard;
				},
				source: function() {
					return source;
				},
				data: function() {
					return data;
				}
			}
		});
		modal.result.catch(function() {
			if (source === 'LINK') {
				if ($state.is('main.channel.detail')) {
					source = broadcasterService.async ? 'LINK_PROFILE' : 'LINK_LIVE';
				} else {
					source = "LINK_OTHER";
				}
			}
			$rootScope.gaEvent('LOGIN', 'DISMISS', source);
		});
		return modal;
	};

	$modal.profileSummary = function(channelId, params, state) {
		params = params || {};
		params.channelId = channelId;
		params.userId = session.loggedIn ? session.user.userId : 0;
		params.state = state || false;

		if (broadcasterService.broadcaster && broadcasterService.broadcaster.broadcastId) {
			params.broadcastId = broadcasterService.broadcaster.broadcastId;
			if (broadcasterService.broadcaster.userId === channelId) {
				params.broadcastRelated = 1;
			}
		}
		var modal = $modal.open({
			templateUrl: 'angularjsapp/src/app/components/profile-summary/profile-summary.tpl.html',
			controller: 'ProfileSummaryCtrl',
			windowClass: 'profile-summary-wrapper',
			resolve: {
				params: function() {
					return params;
				}
			}
		});
		return modal;
	};

	$modal.youtube = function(username) {
		return $modal.open({
			templateUrl: 'angularjsapp/src/app/components/youtube-subscribe/youtube-subscribe.tpl.html',
			controller: 'YoutubeSubscribeCtrl',
			windowClass: 'youtube-modal',
			resolve: {
				username: function() {
					return username;
				}
			}
		});
	};

	$modal.subscribeModal = function(channelId, params) {

		// pass in anything
		params = params || {};
		params.channelId = channelId;
		params.userId = session.loggedIn ? session.user.userId : 0;
		if (broadcasterService.broadcaster && broadcasterService.broadcaster.broadcastId) {
			params.broadcastId = broadcasterService.broadcaster.broadcastId;
			if (broadcasterService.broadcaster.userId === channelId) {
				params.broadcastRelated = 1;
			}
		}

		if (session.user.spendingDisabled) {
			Api.showTopNotification('Spending disabled. Please contact YouNow Support.');
			return false;
		}

		var modal = $modal.open({
			templateUrl: 'angularjsapp/src/app/components/subscribe-modal/subscribe.tpl.html',
			controller: 'SubscribeModalCtrl',
			windowClass: 'subscribe-modal-wrapper',
			resolve: {
				params: function() {
					return params;
				}
			}
		});

		return modal;
	};

	$modal.mediaPlayerModal = function(id, params, broadcast) {
		var modal = $modal.open({
			templateUrl: 'angularjsapp/src/app/components/media-player-modal/media-player-modal.tpl.html',
			controller: 'MediaPlayerModalCtrl',
			windowClass: 'media-player-modal',
			resolve: {
				broadcastId: function() {
					return id;
				},
				params: function() {
					return params || {};
				},
				broadcast: function() {
					return broadcast || {};
				}
			}
		});
		modal.result.catch(function(data) {});
		return modal;
	};

	$modal.mediaPlayerModalExp = function(id, params, broadcast) {
		var modal = $modal.open({
			templateUrl: 'angularjsapp/src/app/components/media-player-modal/exp.tpl.html',
			controller: 'MediaPlayerModalExpCtrl',
			windowClass: 'media-player-modal media-player-modal-exp',
			resolve: {
				broadcastId: function() {
					return id;
				},
				params: function() {
					return params || {};
				},
				broadcast: function() {
					return broadcast || {};
				}
			}
		});
		modal.result.catch(function(data) {});
		return modal;
	};

	$modal.iframe = function(src, extraClass) {
		var windowClass = extraClass ? 'iframe-modal ' + extraClass : 'iframe-modal';
		return $modal.open({
			templateUrl: 'angularjsapp/src/app/components/iframe-modal/iframe-modal.tpl.html',
			controller: 'IframeModalCtrl',
			windowClass: windowClass,
			resolve: {
				src: function() {
					return src;
				}
			}
		});
	};

	$modal.alert = function(message) {
		return $modal.open({
			templateUrl: 'angularjsapp/src/app/components/alert-modal/alert-modal.tpl.html',
			controller: 'AlertModalCtrl',
			windowClass: 'alert-modal',
			resolve: {
				message: function() {
					return message;
				}
			}
		});
	};

	$modal.vip_welcome = function(message) {
		return $modal.open({
			templateUrl: 'angularjsapp/src/app/components/vip-modal/welcome-modal.tpl.html',
			controller: 'VipModalCtrl',
			windowClass: 'vip-modal',
			resolve: {
				message: function() {
					return message;
				}
			}
		});
	};

	$modal.gate = function(data) {
		return $modal.open({
			templateUrl: 'angularjsapp/src/app/components/gate-modal/gate-modal.tpl.html',
			controller: 'GateModalCtrl',
			windowClass: 'gate-modal',
			backdrop: 'static',
			keyboard: false,
			resolve: {
				data: function() {
					return data;
				}
			}
		});
	};

	$modal.ageGate = function() {
		var deferred = $q.defer();
		var language = (window.navigator.language || window.navigator.browserLanguage || window.navigator.systemLanguage || window.navigator.userLanguage).substr(0, 2) || 'en';
		if ((language == 'de' || language.indexOf('de-') != -1) && !Api.store('younowOldEnough') && !$rootScope.skipAgeGate) {
			$rootScope.skipAgeGate = false;
			$modal.gate({
				title: "agegate_modal_title",
				message: "agegate_modal_message",
				decline: "agegate_modal_under",
				confirm: "agegate_modal_over",
			}).result.then(function(response) {
				if (!response) {
					$state.go('lockout');
					var lockoutDate = Math.floor(new Date().getTime() / 1000) + (24 * 60 * 60);
					Api.store('younowAgeLockout', lockoutDate);
				} else {
					Api.store('younowOldEnough', true);
					deferred.resolve();
				}
			});
		} else {
			deferred.resolve();
		}
		return deferred.promise;
	};

	$modal.trap = function(type, user, source, callback) {
		return $modal.open({
			templateUrl: 'angularjsapp/src/app/components/trap-modal/trap-modal.tpl.html',
			controller: 'TrapModalCtrl',
			windowClass: 'trap-modal',
			resolve: {
				data: function() {
					return {
						user: user,
						type: type,
						callback: callback
					};
				},
				source: function() {
					return source;
				}
			}
		});
	};

	$modal.partner = function() {
		return $modal.open({
			templateUrl: 'angularjsapp/src/app/components/partner-modal/partner-modal.tpl.html',
			controller: 'PartnerModalCtrl',
			windowClass: 'partner-modal'
		});
	};

	$modal.partnerAgreement = function() {
		return $modal.open({
			templateUrl: 'angularjsapp/src/app/components/partner-agreement-modal/partner-agreement-modal.tpl.html',
			controller: 'PartnerAgreementModalCtrl',
			windowClass: 'partner-agreement-modal',
			backdrop: 'static',
			keyboard: false
		});
	};

	$modal.shareBroadcast = function(message, type) {
		return $modal.open({
			templateUrl: 'angularjsapp/src/app/components/share-broadcast-modal/share-broadcast-modal.tpl.html',
			controller: 'ShareBroadcastModalCtrl',
			windowClass: 'share-broadcast-ctrl',
			resolve: {
				data: function() {
					return {
						message: message,
						type: type
					};
				}
			}
		});
	};

	$modal.verification = function(params, source) {
		return $modal.open({
			templateUrl: 'angularjsapp/src/app/components/verification-modal/verification-modal.tpl.html',
			controller: 'VerificationModalCtrl',
			windowClass: 'buybars-modal',
			resolve: {
				data: function() {
					return {
						params: params,
						source: source
					};
				}
			}
		});
	};

	$modal.buyBars = function(spendingDisabled) {
		// spending disabled ? then reject
		if (spendingDisabled || spendingDisabled === undefined) {
			var deferred = $q.defer();
			deferred.reject('suspending disabled');
			Api.showTopNotification('Account purchasing disabled. Please email support@younow.com to review this matter.');
			var result = {
				result: deferred.promise
			};
			return result;
		}

		$rootScope.gaEvent('PURCHASE', 'PROMPT', config.buybarsiframe ? 'IFRAME' : 'INLINE');

		var modal = $modal.open({
			templateUrl: 'angularjsapp/src/app/components/buybars-modal/buybars.tpl.html',
			controller: 'BuybarsModalCtrl',
			windowClass: 'buybars-modal'
		});

		modal.result.catch(function(response) {
			if (response === 'backdrop click') {
				$rootScope.gaEvent('PURCHASE', 'DIMISS', config.buybarsiframe ? 'IFRAME' : 'INLINE');
			}
		});

		return modal;

	};

	$modal.ccVerified = function(data) {
		var modal = $modal.open({
			templateUrl: 'angularjsapp/src/app/components/verification-modal/cc-verified.tpl.html',
			controller: 'CcVerifiedModalCtrl',
			windowClass: 'buybars-modal ' + data.type,
			resolve: {
				data: function() {
					return {
						type: data.type,
						data: data.data
					};
				}
			}
		});

		//for tracking later
		// modal.result.catch(function(response) {
		// });

		return modal;

	};

	$modal.epModal = function(state) {
		var template = 'angularjsapp/src/app/components/editors-pick-modals/ep-congrats.tpl.html';
		if (state === 'expired') {
			template = 'angularjsapp/src/app/components/editors-pick-modals/ep-expired.tpl.html';
		}

		var modal = $modal.open({
			templateUrl: template,
			controller: 'EpModalCtrl',
			windowClass: 'ep-modal',
			resolve: {
				data: function() {
					return {
						state: state
					};
				}
			}
		});

		return modal;
	};

	$modal.mobileDownloadExperiment = function(source, customCopy) {
		var modal = $modal.open({
			templateUrl: 'angularjsapp/src/app/components/mobile-download/mobile-download-experiment-modal.tpl.html',
			controller: 'mobileDownloadCtrl',
			controllerAs: 'vm',
			windowClass: 'mobile-download-experiment',
			resolve: {
				data: function() {
					return {
						source: source,
						customCopy: customCopy
					};
				}
			}
		});
		if (source) {
			$rootScope.gaEvent('Conversion', 'Get App Experiment', source);
		}
		return modal;
	};

	$modal.mobileDownload = function(source, customCopy) {
		var modal = $modal.open({
			templateUrl: 'angularjsapp/src/app/components/mobile-download/mobile-download-modal.tpl.html',
			controller: 'mobileDownloadCtrl',
			controllerAs: 'vm',
			windowClass: 'mobile-download-modal',
			resolve: {
				data: function() {
					return {
						source: source,
						customCopy: customCopy
					};
				}
			}
		});

		if (source) {
			$rootScope.gaEvent('Conversion', 'Click Get App', source);
		}

		return modal;
	};

	$modal.spendingFailed = function(params) {
		return $modal.open({
			templateUrl: 'angularjsapp/src/app/components/spending-redirect-modal/failed.tpl.html',
			controller: 'SpendingRedirectModalCtrl',
			controllerAs: 'vm',
			windowClass: 'spending-redirect-modal',
			resolve: {
				params: function() {
					return params;
				}
			}
		});
	};

	$modal.spendingRedirect = function() {
		var modal = $modal.open({
			templateUrl: 'angularjsapp/src/app/components/spending-redirect-modal/spending-redirect-modal.tpl.html',
			controller: 'SpendingRedirectModalCtrl',
			controllerAs: 'vm',
			windowClass: 'spending-redirect-modal',
			resolve: {
				params: function() {
					return {};
				}
			}
		});

		return modal;
	};

	$modal.reconnect = function() {
		var modal = $modal.open({
			templateUrl: 'angularjsapp/src/app/components/reconnect-modal/reconnect-modal.tpl.html',
			controller: 'ReconnectModalCtrl',
			controllerAs: 'vm',
			windowClass: 'reconnect-modal'
		});

		return modal;
	};


	// Setup SWF mute state
	var initialVol = 80;
	var newVol = Api.store('younowVol');
	if (newVol !== undefined && newVol !== null && !isNaN(Number(newVol))) {
		initialVol = Number(newVol);
	}
	Api.store('younowVol', initialVol);

	//bootup the tracking pixel
	trackingPixel.startPinging();

	$document.on("click", function(e) {
		if (!e.target.outerHTML) {
			return false;
		}
		Api.addToStack(e.target.outerHTML.substring(0, 100), 'lastClickStack');
	});

}])

;
