angular.module('younow.home', [
	'ui.router'
])

.config(["$stateProvider", function config($stateProvider) {

	$stateProvider.state('home', {
		url: '{la:' + window.YouNow.UILanguageRegex + '}',
		templateUrl: 'angularjsapp/src/app/states/home/home.tpl.html',
		controller: 'HomeCtrl',
		controllerAs: 'vm'
	});

	$stateProvider.state('index', {
		url: '/index.php',
		templateUrl: 'angularjsapp/src/app/states/home/home.tpl.html',
		controller: 'HomeCtrl',
		controllerAs: 'vm'
	});

}])

.controller('HomeCtrl', function($interval, $state, $scope, $timeout, $modal, config, Api, dashboard, session, $rootScope, trackingPixel, broadcasterService, $window, $stateParams, ab) {

	// SET page language
	if ($stateParams.la && $stateParams.la.indexOf('/')===0) {
		var la = $stateParams.la.substr(1,2);
		config.setTempLanguage(la);
	}

	// not a phone, continue
	// is phone, stop
	if (!/Android/i.test(navigator.userAgent) &&
		!/BlackBerry/i.test(navigator.userAgent) &&
		!/iPhone|iPad|iPod/i.test(navigator.userAgent) &&
		!/IEMobile/i.test(navigator.userAgent)
	) {} else {
		window.location.href = '/';
	}

	var vm = this,
		featuredTagColors;

	vm.config = config;
	vm.telInputId = 'telInput';
	vm.broadcasterService = broadcasterService;
	vm.dashboard = dashboard;
	vm.thumb = config.settings.ServerCDNBaseUrl + '/php/api/channel/getImage/channelId=';
	vm.noThumb = config.settings.ServerCDNBaseUrl + '/images/nothumb.jpg';

	vm.nothumb = config.settings.ServerCDNBaseUrl + '/images/nothumb.jpg';
	vm.ab = ab;

	vm.trackMobile = function(platform) {
		if (platform == 'IOS' || platform == 'ANDROID') {
			trackingPixel.trackClick('GETTHEAPP', {
				field1: 'SIDEBAR'
			});
		}
		var activity;
		if (broadcasterService.async && $state.current.name !== 'main.settings' && $state.current.name !== 'about' && $state.current.name !== 'policy' && $state.current.name !== 'main.explore' && $state.current.name !== 'lockout') {
			activity = 'PROFILE';
		}
		if (!broadcasterService.async) {
			activity = 'BROADCAST';
		}
		if ($state.current.name === 'main.explore') {
			activity = 'EXPLORE';
		}
		if (activity === undefined) {
			activity = 'OTHER';
		}
		Api.goMobile(platform, session.user.level, '_SIDEBAR', activity);
	};

	$scope.base = config.settings.ServerCDNBaseUrl;
	$scope.loggingIn = {};

	var soft = null;
	var source = null;

	var rejectLogin = function(reason) {};
	$scope.login = function(type) {
		if (!$scope.attemptedLogin) {
			$scope.attemptedLogin = true;
		}
		$scope.loggingIn[type] = true;
		if (session.authenticate[type]) {
			$timeout(function() {
				session.auth(type)

				// modal used
				.then(function(response) {
					// Success
					if (response && response.data && response.data.id) {
						// log
						if (response.data.newUser) {
							$rootScope.gaEvent('LOGIN', 'LOGIN_NEW_' + type.toUpperCase() + '', source);
						} else {
							$rootScope.gaEvent('LOGIN', 'LOGIN_RETURNING_' + type.toUpperCase() + '', source);
						}
						//  Close after slight delay, to give time to fetch fan status and update UI
						if (response.data.coinFeedbackCopy && response.data.coinFeedbackAmount) {
							Api.showTopNotification(response.data.coinFeedbackCopy + ' <img class="coin-sm" src="' + config.settings.ServerCDNBaseUrl + '/angularjsapp/src/assets/images/icons_v3/menu_user_coins1.png">' + response.data.coinFeedbackAmount, 'now', false, undefined, 5000);
						}
						// redirect, because it doesn't do it manually???
						$state.go("main.channel.detail");
					}
					// Reject if response was empty
					else {
						rejectLogin('Unsuccessful');
					}
					$scope.loggingIn[type] = false;
				})

				// modal closed
				.catch(function(response) {
					$scope.loggingIn[type] = false;
					rejectLogin('Failed to login');
				});

			}, 0);
		} else {
			rejectLogin('Invalid auth method');
		}
	};
	$scope.showMoreOptions = function() {
		$scope.moreOptions = true;
	};


	vm.showMoreOptions = function() {
		vm.moreOptions = true;
	};

	vm.cancel = function() {};

	vm.login = function(type) {
		if (!vm.attemptedLogin) {
			vm.attemptedLogin = true;
		}
		vm.loggingIn[type] = true;
		checkPopup(type);

		$rootScope.gaEvent('LOGIN', 'ATTEMPT_' + type.toUpperCase(), source);
		trackingPixel.trackClick('LOGIN', {
			field1: type.toUpperCase(),
			field2: source.toUpperCase()
		});

		if (session.authenticate[type]) {
			$timeout(function() {
				session.auth(type)

				// modal used
				.then(function(response) {
					// Success
					if (response && response.data && response.data.id) {
						// log
						if (response.data.newUser) {
							$rootScope.gaEvent('LOGIN', 'LOGIN_NEW_' + type.toUpperCase() + '', source);
						} else {
							$rootScope.gaEvent('LOGIN', 'LOGIN_RETURNING_' + type.toUpperCase() + '', source);
						}
						//  Close after slight delay, to give time to fetch fan status and update UI
						$timeout(function() {}, 300);
						if (response.data.coinFeedbackCopy && response.data.coinFeedbackAmount) {
							Api.showTopNotification(response.data.coinFeedbackCopy + ' <img class="coin-sm" src="' + config.settings.ServerCDNBaseUrl + '/angularjsapp/src/assets/images/icons_v3/menu_user_coins1.png">' + response.data.coinFeedbackAmount, 'now', false, undefined, 5000);
						}
					}
					// Reject if response was empty
					else {
						rejectLogin('Unsuccessful');
					}
					vm.loggingIn[type] = false;
				})

				// modal closed
				.catch(function() {
					vm.loggingIn[type] = false;
					rejectLogin('Failed to login');
				});

			}, 0);
		} else {
			rejectLogin('Invalid auth method');
		}
	};

	function checkPopup(type) {
		var secondsOpened = 0;
		var twitterWindow = $interval(function() {
			secondsOpened++;
			//hard close after 60 seconds
			if (secondsOpened === 60 && window[type + 'Popup'] && window[type + 'Popup'].close) {
				window[type + 'Popup'].close();
			}
			if (secondsOpened === 20 && type === 'google') {
				vm.loggingIn[type] = false;
				$interval.cancel(twitterWindow);
			}
			if (window[type + 'Popup'] && window[type + 'Popup'].closed) {
				vm.loggingIn[type] = false;
				$interval.cancel(twitterWindow);
			}
		}, 1000);
	}


	var getBroadcastThumb = function(user) {
		var thumb;
		if (user.tag && user.tag.length > 0 && user.userId) {
			thumb = config.settings.ServerCDNBaseUrl + "/php/api/getBroadcastThumb/userId=" + user.userId;
		} else {
			thumb = config.settings.ServerCDNBaseUrl + "/php/api/channel/getImage/channelId=" + user.userId;
		}
		return thumb;
	};

	vm.trustedSrc = function(src) {
		return Api.trustedSrc(src);
	};

	vm.stateChange = function(state, params, isTrackingExplore) {
		broadcasterService.channelSwitch = 'START';
		if (!params) {
			params = {};
		}
		// explore (top)
		if (isTrackingExplore) {
			$rootScope.gaEvent('Conversion', 'Go To Explore', 'HOME');
		}
		// explore/TAG
		if (state === 'main.explore' && params.tag) {
			if (params.tag.indexOf('#') !== -1) {
				params.tag = params.tag.replace('#', '');
			}
			$rootScope.gaEvent('Conversion', 'Click Tag', 'HOME');
			trackingPixel.trackClick('TAG', {
				field1: 'HOME'
			});
		}
		// explore
		else if (state === 'main.explore' && !params.tag) {
			trackingPixel.trackClick('EXPLORE', {
				field1: 'HOME'
			});
		}
		// broadcast
		else if (state === 'main.channel.detail') {
			//trackingPixel.trackClick('BROADCASTER');
		}
		// other
		if (state) {
			if (params) {
				$state.go(state, params);
			} else {
				$state.go(state);
			}
		}
	};

	vm.openLoginModal = function(cta, params) {
		$modal.loginModal(false, 'HOME-' + cta).result.then(function(response) {
			if (response.data.errorCode === 0 && $state.current.name !== 'main.channel.detail') {
				$state.go('main.channel.detail');
			}
		});

		if (params && params.trackClick) {
			trackingPixel.trackClick('HOME_JOIN', {
				field1: params.trackClick
			});
		}

		if (cta === "SIGNUP") {
			$rootScope.gaEvent('Conversion', 'Click Signup', 'HOME');
		} else {
			$rootScope.gaEvent('Conversion', 'Click Login', 'HOME');
			trackingPixel.trackClick('SIGNIN');
		}

	};

	vm.getTheApp = function() {
		trackingPixel.trackClick('GETTHEAPP', {
			field1: 'HOME'
		});
		$modal.mobileDownload('HOME');
	};


	//if it's a prerender bot then let's direct him to the app
	if (window.isPrerender) {
		renderPage();
	}

	// // Listen for when the user logs in / out
	if (!config.showHomepage) {
		if (Api.store('lastNetwork')) {
			$timeout(function() {
				$state.go('main.channel.detail');
			}, 0);
		} else {
			renderPage();
			config.showHomepage = true;
			Api.store('hideYounowLanding', true);
		}
	} else {
		if (session.user && session.user.userId === 0) {
			renderPage();
		} else {
			$state.go('main.channel.detail');
		}
	}

	// function populateTrendingBroadcasts() {
	// 	dashboard.fetchTrendingBroadcasts()
	// 		.then(function(response) {
	// 			if (response) {
	// 				response = response.splice(0, 9);

	// 				//truncate the viewers and fans
	// 				for (var i = 0; i < response.length; i++) {
	// 					response[i].thumb = getBroadcastThumb(response[i]);

	// 					if (response[i].totalFans || response[i].fans) {
	// 						response[i].totalFans = response[i].fans = Api.squashedNumber(response[i].totalFans || response[i].fans, 3);
	// 					}
	// 					if (response[i].viewers) {
	// 						response[i].viewers = Api.squashedNumber(response[i].viewers, 3);
	// 					}
	// 				}

	// 				vm.trendingBroadcasts = response;
	// 			}
	// 		});
	// }

	function populatePopularTags() {
		Api.get('younow/popularTags', {
				locale: config.UILocale=='ar' ? 'me' : config.UILocale
			}, true)
			.then(function(response) {
				if (response.data && response.data.popular_tags) {
					for (var tag in response.data.popular_tags) {
						var currentTag = response.data.popular_tags[tag];
						if (currentTag) {
							if (config.UILocale === 'ar') {
								//encode
								currentTag.tagLink = encodeURI(currentTag.tag);
							} else {
								currentTag.tagLink = currentTag.tag;
								currentTag.tag = '#' + currentTag.tag;
							}
						}
					}
					vm.liveTopics = response.data.popular_tags;
				}
			});
	}

	function renderPage() {
		vm.renderPage = true;
		vm.baseCDN = config.settings.ServerCDNBaseUrl;
		//populateTrendingBroadcasts(); // using dashboard.users now
		populatePopularTags();
		window.waitForPageType = false;
		$rootScope.gaPage({
			pageType: 'home'
		});
		$rootScope.title = 'YouNow | Live Stream Video Chat | Free Apps on Web, iOS and Android';
	}

	$scope.doAboutClick = function(action, label) {
		if ($state.is('about')) {
			$rootScope.gaEvent('About Page Button Click', action, label);
		}
	};
	$scope.openDoc = function(e, label) {
		$scope.doAboutClick('Footer link', label);
		if (!$state.is('policy')) {
			$window.open(e.target.href, '_blank');
			e.preventDefault();
		}
	};

	$scope.showMoreOptions = function() {
		$scope.moreOptions = true;
	};

	$scope.sessionAvailable = false;
})

;
