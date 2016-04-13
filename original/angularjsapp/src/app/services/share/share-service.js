angular.module('younow.services.shareService', [])

.factory('shareService', ["$q", "$rootScope", "session", "swf", "Api", "config", "$timeout", "$window", "$interval", "broadcasterService", function($q, $rootScope, session, swf, Api, config, $timeout, $window, $interval, broadcasterService) {

	var service = {};

	/* TWITTER */

	service.shareTwitter = function() {
		var target = 'twitter';
		var deferred = $q.defer();

		// once per minute
		if (swf.snapshot.shared[target]) {
			swf.snapshot.sharing[target] = false;
			// tooltip ui
			swf.snapshot.retake = true;
			Api.triggerTooltip("snapshot-retake", 5000);
			service.trackFunnel(target + "_duplicate");
			// prevent js
			deferred.reject("cooldown");
			return deferred.promise;
		}

		// if connected
		if (session.user && session.user.twitterId) {
			service.sendShare(target, 2);
			deferred.resolve("success");
			return deferred.promise;

			// if NOT connected
		} else {
			$timeout(function() {
				$rootScope.gaEvent('CONNECT', 'ATTEMPT_TWITTER', 'SHARE');
				session.authenticate[target]().then(function(data) {
					return session.login(data, true).then(function(data) {
						//authenticated
						if (data.data.errorCode === 0) {
							$rootScope.gaEvent('CONNECT', 'CONNECT_TWITTER', 'SHARE');
							swf.snapshot.sharing[target] = true;
							service.sendShare(target, 2);
							deferred.resolve("success");
							if (twitterWindow) {
								$interval.cancel(twitterWindow);
							}
							// auth failed
						} else {
							$rootScope.gaEvent('CONNECT', 'ERROR_TWITTER_' + data.data.errorCode, 'SHARE');
							swf.snapshot.sharing[target] = false;
						}
					});
				});
				var secondsOpened = 0;
				var twitterWindow = $interval(function() {
					secondsOpened++;
					//hard close after 60 seconds
					if (secondsOpened === 60) {
						$window.twitterPopup.close();
					}
					if ($window.twitterPopup && $window.twitterPopup.closed) {
						swf.snapshot.sharing[target] = false;
						$interval.cancel(twitterWindow);
					}
				}, 1000);
			}, 0);
			return deferred.promise;
		}
	};

	/* TUMBLR */

	service.shareTumblr = function() {
		var target = 'tumblr';
		var deferred = $q.defer();

		// once per minute
		if (swf.snapshot.shared[target]) {
			swf.snapshot.sharing[target] = false;
			// tooltip ui
			swf.snapshot.retake = true;
			Api.triggerTooltip("snapshot-retake", 5000);
			service.trackFunnel(target + "_duplicate");
			// prevent js
			deferred.reject("cooldown");
			return deferred.promise;
		}

		// if connected
		if (session.user && session.user.tumblrId) {
			service.sendShare(target, 16);
			deferred.resolve("success");
			return deferred.promise;

			// if NOT connected
		} else {
			$timeout(function() {
				$rootScope.gaEvent('CONNECT', 'ATTEMPT_TUMBLR', 'SHARE');
				session.authenticate[target]().then(function(data) {
					return session.login(data, true).then(function(data) {
						//authenticated
						if (data.data.errorCode === 0) {
							$rootScope.gaEvent('CONNECT', 'CONNECT_TUMBLR', 'SHARE');
							swf.snapshot.sharing[target] = true;
							service.sendShare(target, 16);
							deferred.resolve("success");
							// auth failed
						} else {
							$rootScope.gaEvent('CONNECT', 'ERROR_TUMBLR_' + data.data.errorCode, 'SHARE');
							swf.snapshot.sharing[target] = false;
						}
					});
				});
				
			}, 0);
			return deferred.promise;
		}
	};

	/* FACEBOOK */

	service.shareFacebook = function() {
		var target = 'facebook';

		// if already shared
		if (swf.snapshot.shared[target]) {
			swf.snapshot.sharing[target] = false;
			// tooltip ui
			swf.snapshot.retake = true;
			Api.triggerTooltip("snapshot-retake", 5000);
			service.trackFunnel(target + "_duplicate");
			return false;
		}

		// facebook && publish-permitted
		if (session.user && (session.user.facebookId || service.facebookConnected) && swf.share_facebook_permitted) {

			swf.postGift(session.user.userId, swf.broadcast.userId, 15, 1, swf.snapshot.snapshot, 1).then(function(response) {
				// make data
				swf.snapshot.id = response.data.snapshotId;
				// post data
				var post = {
					link: swf.snapshot.links.FACEBOOK,
					picture: config.settings.ServerCDNBaseUrl + '/php/api/getSnapshot/id=' + swf.snapshot.id,
					message: swf.broadcast.share_message
				};
				service.shareFacebookSend(post);
			});

			// facebook
		} else if (session.user && session.user.facebookId) {
			service.shareFacebookLogin();

			// site
		} else if (session.user) {
			// modal
			$timeout(function() {
				$window.tempFBscope = "public_profile,email,user_friends,publish_actions";
				session.authenticate[target]().then(function(data) {
					$rootScope.gaEvent('CONNECT', 'ATTEMPT_FACEBOOK', 'SHARE');
					session.login(data, true).then(function(data) {
						// facebook auth
						if (data.data.errorCode === 0) {
							$rootScope.gaEvent('CONNECT', 'CONNECT_FACEBOOK', 'SHARE');
							service.facebookConnected = true;
							service.shareFacebookAuth();
						} else {
							$rootScope.gaEvent('CONNECT', 'ERROR_FACEBOOK_' + data.data.errorCode, 'SHARE');
							swf.snapshot.sharing[target] = false;
						}
					}, function(reason) {
						swf.snapshot.sharing[target] = false;
					});
				}, function(reason) {
					swf.snapshot.sharing[target] = false;
				});
			}, 0);

			// not logged in
		} else {
			// caught in chat.js -> shows login modal
		}
	};

	service.shareFacebookAuth = function() {
		var target = 'facebook';
		FB.api('/me/permissions',
			function(response) {
				// if permitted, return
				if (response && !response.error) {
					for (var each in response) {
						for (var permission in response[each]) {
							if (response[each][permission].permission == 'publish_actions' && response[each][permission].status == 'granted') {

								// share
								swf.share_facebook_permitted = true;
								service.shareFacebook();
								return true;
							}
						}
					}
				}

				// give up, already asking for publish_actions in shareFacebook()
				swf.snapshot.sharing[target] = false;
				swf.snapshot.shared[target] = false;
				Api.showTopNotification('Please click "share" again and allow posting to facebook.');
				return false;
				//service.shareFacebookLogin();
			}
		);

	};

	service.shareFacebookLogin = function() {
		var target = 'facebook';

		// loop, only once per snapshot
		if (!swf.snapshot.shared.facebook_login_attempted) {
			swf.snapshot.shared.facebook_login_attempted = true;
			$timeout(function() {
				swf.snapshot.shared.facebook_login_attempted = false;
			}, 500);

			// if not permitted, login again
			$timeout(function() {
				FB.login(function(response) {
					service.shareFacebookAuth();
				}, {
					scope: 'publish_actions',
					auth_type: 'rerequest'
				});
			}, 0);

			// failed, give up
		} else {
			swf.snapshot.sharing[target] = false;
		}
	};

	service.shareFacebookSend = function(postData) {
		var target = 'facebook';
		var callback = function(response) {
			if (response.post_id) {
				swf.snapshot.shared.facebook_postId = response.post_id;
				swf.snapshot.shared[target] = true;
				service.sendShare("facebook", 4);
				if (!swf.broadcast.shared[target]) {
					service.incrementShareCount(target);
				}
			} else {
				service.trackFunnel(target + "_error_fb");
			}
			swf.snapshot.sharing[target] = false;
		};

		window.FB.ui({
			method: 'share',
			href: swf.snapshot.links.FACEBOOK,
		}, callback);
		// FB.api(
		// 	'/me/feed',
		// 	'POST',
		// 	postData,
		// 	function(response) {
		// 		if (response.id) {
		// 			swf.snapshot.shared.facebook_postId = response.id;
		// 			service.sendShare("facebook", 4);
		// 		} else {
		// 			service.trackFunnel(target + "_error_fb");
		// 		}
		// 	}
		// );
	};

	service.incrementShareCount = function(target) {
		// # user_shares (local)
		var user_shares_before = swf.broadcast.user_shares = (swf.broadcast.user_shares || 0);
		var user_shares_current = 0;
		for (var s in swf.broadcast.shared) {
			if (swf.broadcast.shared[s] === true) {
				user_shares_current++;
			}
		}
		if (user_shares_current === 0) {
			user_shares_current = 1;
		}
		swf.broadcast.user_shares = user_shares_current;

		// # shares (total)
		var user_shares_incremented = (user_shares_current - user_shares_before) > 0 ? true : false;
		if (user_shares_incremented) {
			swf.broadcast.shares++;
		}

		// display
		Api.triggerTooltip("broadcast-shares", 2000);
	};

	service.sendShare = function(target, sn) {
		var userId = session.user.userId;
		var channelId = swf.broadcast.userId;
		var comment = swf.broadcast.share_message;

		var post = {
			userId: userId,
			channelId: channelId,
			comment: comment,
			sn: sn,
			sendTweet: target === 'twitter' ? 1 : 0,
			createPost: target === 'tumblr' ? 1 : 0
		};

		if (target === 'twitter') {
			post.snapshot = swf.snapshot.snapshot;
		}
		var trackingTarget = (target == "younow") ? "invite" : target;
		Api.post('broadcast/share', post)
			.success(function(data, status, headers, config) {
				swf.snapshot.sharing[target] = false;
				if (data.errorCode === 0) {
					swf.snapshot.shared[target] = true;
					if (!swf.broadcast.shared[target]) {
						swf.broadcast.shared[target] = true;
						service.incrementShareCount(target);
					}
					service.trackFunnel(trackingTarget + "_success");
					if(target === 'tumblr') {
						//Api.preloadAdvection(broadcasterService.broadcaster.media.prefix,broadcasterService.broadcaster.broadcastId);
					}
				} else {
					service.trackFunnel(trackingTarget + "_error_" + data.errorCode);
				}
			})
			.error(function(data, status, headers, config) {
				swf.snapshot.sharing[target] = false;
				service.trackFunnel(trackingTarget + "_error_yn");
			});
	};

	service.trackFunnel = function(action) {
		// Bump the count for this action up by one
		swf.broadcast.shareCount[action] = swf.broadcast.shareCount[action] ? swf.broadcast.shareCount[action] + 1 : 1;
		// Send to GA
		$rootScope.gaEvent('SHARE', action, swf.broadcast.shareCount[action]);
	};

	return service;
}]);
