angular.module('younow.modals.profile-summary', [])
	.controller('ProfileSummaryCtrl', ["$rootScope", "$scope", "$modalInstance", "$timeout", "$location", "config", "Api", "session", "broadcasterService", "params", "$modal", "$state", "$filter", "eventbus", "swf", "upload", "guestService", function($rootScope, $scope, $modalInstance, $timeout, $location, config, Api, session, broadcasterService, params, $modal, $state, $filter, eventbus, swf, upload, guestService) {
		if (!session.user) {
			session.user = {};
		}
		$scope.modal = {
			reason: params.comment ? decodeURIComponent(params.comment) : undefined
		};
		$scope.base = config.settings.ServerCDNBaseUrl;
		if (session.user.userId == params.channelId) {
			$scope.thumb = config.settings.ServerLocalBaseUrl + '/php/api/channel/getImage/channelId=' + params.channelId + '?' + (Math.random() * 10000).toFixed();
			$scope.cover = config.settings.ServerLocalBaseUrl + '/php/api/channel/getCover/channelId=' + params.channelId + '?' + (Math.random() * 10000).toFixed();
		} else {
			$scope.thumb = config.settings.ServerCDNBaseUrl + '/php/api/channel/getImage/channelId=' + params.channelId;
			$scope.cover = config.settings.ServerCDNBaseUrl + '/php/api/channel/getCover/channelId=' + params.channelId;
		}
		$scope.nothumb = config.settings.ServerCDNBaseUrl + '/images/nothumb.jpg';
		$scope.session = session;
		$scope.modal.state = params.state || '';
		$scope.globalVars = window.globalVars;
		$scope.config = config;

		var openedFrom;

		// flagging deeplink
		if (params.isFlagging) {
			$timeout(function() {
				$scope.toggleDropdown();
			}, 0);
		}

		// following state
		var follow_icons = {
			'twitter': 'ynicon-social-tw',
			'facebook': 'ynicon-social-fb',
			'youtube': 'ynicon-icon-social-yt',
			'instagram': 'ynicon-social-insta',
			'google': 'ynicon-social-gp'
		};
		var follow_codes = {
			'twitter': 2,
			'facebook': 4,
			'instagram': 8,
			'youtube': 16,
			'google': 32
		};

		var authed = {
			'twitter': 'twitterAuth',
			'facebook': 'facebookAuth',
			'instagram': 'instagramAuth',
			'youtube': 'youTubeAuth',
			'google': 'googleAuth'
		};

		$scope.sn_titles = {
			'twitter': 'Twitter',
			'facebook': 'Facebook',
			'instagram': 'Instagram',
			'youtube': 'YouTube',
			'google': 'Google+'
		};
		$scope.sn_verb = {
			'twitter': 'Follow',
			'facebook': 'Follow',
			'instagram': 'Follow',
			'youtube': 'Subscribe to',
			'google': 'Follow'
		};
		$scope.sn_verbed = {
			'twitter': 'Following',
			'facebook': 'Following',
			'instagram': 'Following',
			'youtube': 'Subscribed to',
			'google': 'Following'
		};

		function checkIfFollowing(network, options) {
			if ($scope.canFollow(network) && session.user[authed[network]]) {
				Api.get('channel/isFollow', {
						userId: session.user.userId,
						channelId: params.channelId,
						sn: follow_codes[network],
						followType: openedFrom
					})
					.then(function(data) {
						if (data) {
							if (data.data.follow) {
								$rootScope.gaEvent('FOLLOW', network.toUpperCase() + '_FOLLOWING', openedFrom);
							}
							$scope.modal.following.followed = data.data.follow;
							$scope.modal.state = 'following';
						}
					});
			} else {
				$scope.modal.state = 'following';
			}
		}

		$scope.canFollow = function(network) {
			if (network == 'twitter' || network == 'youtube') {
				return true;
			}
			return false;
		};

		$scope.setupFollowing = function(network, options) {
			if (!network) {
				network = params.network;
			}
			if (!params.network && options) {
				$rootScope.gaEvent('FOLLOW', network.toUpperCase() + '_OPEN', openedFrom);
			}

			$scope.modal.following = {
				network: network,
				icon: follow_icons[network],
				back_to_summary: false
			};

			if (!session.loggedIn) {
				$modal.loginModal('', 'FOLLOWING').result.then(function(response) {
					if ($scope.user.userId == session.user.userId) {
						return false;
					}
					checkIfFollowing(network, options);
				});
			} else {
				checkIfFollowing(network, options);
			}
		};

		$scope.startFollowing = function(network) {
			$scope.setupFollowing(network);

			// if connected
			if (session.user && session.user[authed[network]]) {
				follow(network);
				// if NOT connected
			} else {

				$rootScope.gaEvent('CONNECT', 'ATTEMPT_' + network.toUpperCase(), 'FOLLOW');
				session.authenticate[network]().then(function(data) {
					session.login(data, true)
						.then(function(data) {
							if (data.data.errorCode === 0) { //authenticated
								$rootScope.gaEvent('CONNECT', 'CONNECT_' + network.toUpperCase(), 'FOLLOW');
								follow(network);
							} else { //fail auth
								$rootScope.gaEvent('CONNECT', 'ERROR_' + network.toUpperCase() + '_' + data.data.errorCode, 'FOLLOW');
							}
						});
				});

			}
		};
		var follow = function(network) {
			$rootScope.gaEvent('FOLLOW', network.toUpperCase() + '_FOLLOW_ATTEMPT', openedFrom);
			var post = {
				userId: session.user.userId,
				channelId: params.channelId,
				sn: follow_codes[network],
				followType: openedFrom
			};
			if (broadcasterService.broadcaster && broadcasterService.broadcaster.broadcastId) {
				post.broadcastId = broadcasterService.broadcaster.broadcastId;
			}

			Api.post('channel/follow', post).success(function(data) {
				if (data.follow) {
					$scope.modal.following.followed = true;
					$rootScope.gaEvent('FOLLOW', network.toUpperCase() + '_FOLLOW_SUCCESS', openedFrom);
				}
			});
		};
		if (params.state == 'following') {
			$scope.setupFollowing();
		}


		$scope.openUrl = function(url, source) {
			if ($scope.modal.state === 'following') {
				if (source === 'link') {
					$rootScope.gaEvent('FOLLOW', $scope.modal.following.network.toUpperCase() + '_PROFILE_LINK', openedFrom);
				}
				if (source === 'button') {
					$rootScope.gaEvent('FOLLOW', $scope.modal.following.network.toUpperCase() + '_PROFILE_BUTTON', openedFrom);
				}
			}
			window.open(url, '_blank');
		};

		function getUserActions() {
			if (guestService.guest && guestService.guest.userId == params.channelId) {
				params.broadcastRelated = 1;
			}
			var postData = {
				userId: params.userId,
				onUserId: params.channelId,
				broadcastId: params.channelId,
				userOnly: (params.userOnly || false),
				broadcastRelated: (params.broadcastRelated || 0)
			};
			if (params.sf) {
				postData.selfie = 1;
			}
			Api.get('getUserActions', postData).success(function(data) {
				$scope.actions = data.actions;
				// Hard-coded additional actions
				if (session.isMod() || session.user.role == 9) {
					$scope.actions.push({
						"actionId": "1099511627776",
						"actionName": "User Chat Log",
						"actionPath": "chatLogs.php?userId=" + params.channelId
					});
					if (session.user.role != 9) {
						$scope.actions.push({
							"actionId": "1099511627776",
							"actionName": "Show User History",
							"actionPath": "moderatorLog.php?userIds=" + params.channelId
						});
					}
					if (broadcasterService.broadcaster && broadcasterService.broadcaster.userId === params.channelId) {
						$scope.actions.push({
							"actionId": "1099511627776",
							"actionName": "Broadcast Chat Log",
							"actionPath": "chatLogs.php?broadcastId=" + params.broadcastId
						});
					}
				}
				for (var i = 0; i < data.actions.length; i++) {
					if (data.actions[i].reportOptions) {
						$scope.flags = data.actions[i].reportOptions;
						break;
					}
				}
			});
		}
		if (params.userId) {
			getUserActions();
		}

		var getInfo = function() {
			// so if call fails it can be tried again
			Api.get('channel/getInfo', {
				channelId: params.channelId
			}, 'usecdn').success(function(data) {
				if (!data.userId) {
					Api.showTopNotification('This user is no longer available');
					$modalInstance.close();
					return false;
				}

				// format
				data = broadcasterService.channelFormat(data);

				// subscriptions tweak
				if (data.latestSubscriptions && Object.keys(data.latestSubscriptions).length > 8) {
					var latestSubscriptions = data.latestSubscriptions;
					var latestSubscriptionsAdd = 0;
					data.latestSubscriptions = {};
					var i = 0;
					for (var k in latestSubscriptions) {
						if (i < 8) {
							data.latestSubscriptions[k] = latestSubscriptions[k];
						} else {
							latestSubscriptionsAdd++;
						}
						i++;
					}
					data.latestSubscriptionsPlus = (data.latestSubscriptionsPlus || 0) + latestSubscriptionsAdd;
				}

				// track
				$rootScope.gaPage({
					page: 'Summary',
					path: '/' + data.profile + '/summary'
				});
				data.description = Api.convertEmoji(Api.prepareDescription(data.description));
				data.location = Api.cleanLocation(data, true);
				data.fullName = data.useprofile === 1 ? data.profile : data.firstName + " " + data.lastName;
				data.friendlyName = data.useprofile ? data.profile : data.firstName;
				angular.forEach(data.permissions, function(permission) {
					if (permission.id === "6") {
						data.channelmanager = true;
					}
					if (permission.id === "8") {
						data.ambassador = true;
					}
				});
				data.facebookLink = (data.facebookOption == "1" && data.websiteUrl.length) ? data.websiteUrl : 'http://www.facebook.com/' + data.facebookId;
				if (data.facebookLink.substr(0, 4) != 'http') {
					data.facebookLink = 'http://' + data.facebookLink;
				}
				$scope.user = data;

				// filter
				try {
					$scope.user.totalFans = $filter('number')($scope.user.totalFans);
					$scope.user.totalSubscribers = $filter('number')($scope.user.totalSubscribers);
					$scope.user.dateString = $filter('date', 'MM/dd/yyyy')($scope.user.dateCreated.substr(0, 10));
				} catch (e) {
					console.warn('filter error:', e);
				}

				//find the tracking source
				if (broadcasterService.async && $state.current.name !== 'main.explore') {
					if (broadcasterService.channel.userId === data.userId) {
						openedFrom = 'PROFILE_OWNER';
					} else {
						openedFrom = 'PROFILE_OTHER';
					}
				}
				if (!broadcasterService.async && broadcasterService.broadcaster) {
					if (broadcasterService.broadcaster.userId === data.userId) {
						openedFrom = 'BROADCASTER';
					} else {
						openedFrom = params.source;
					}
				}
				if ($state.current.name === 'main.explore') {
					openedFrom = 'EXPLORE';
				}

				//This is just a temporary fix to track the guest broadcasting context (we will remove for a better solution in the near future)
				$scope.openedFrom = openedFrom;

				//track the SN if state is opened as following
				if (params.state === 'following') {
					$rootScope.gaEvent('FOLLOW', params.network.toUpperCase() + '_OPEN', openedFrom);
				}

				if (data.twitterHandle && data.twitterHandle.length > 0) {
					$rootScope.gaEvent('FOLLOW', 'TWITTER_DISPLAY', openedFrom);
				}

				if (data.youTubeChannelId && data.youTubeChannelId.length > 0) {
					$rootScope.gaEvent('FOLLOW', 'YOUTUBE_DISPLAY', openedFrom);
				}

				// all subscriptions
				Api.get('channel/getSubscriberOf/channelId=' + $scope.user.userId, {}, true).success(function(data) {
					if (data.subscriberOf) {
						$scope.user.subscriptions = data.subscriberOf;
						if ($scope.user.subscriptions.length > 5) {
							$scope.user.subscriptions_extras = $scope.user.subscriptions.splice(4);
							$scope.user.subscriptions_extras.reverse();
						}
					} else {
						console.error('channel/getSubscriberOf/channelId=' + $scope.user.broadcaster.userId + ':', data);
					}
				});

			}, function(error) {
				getInfo();
			});
		};
		getInfo();


		$scope.composeMessage = function() {
			if (params.userId) {
				$scope.modal.state = 'messaging';
			} else {
				session.showLoginModal('', 'POST').result.then($scope.composeMessage);
			}
		};
		$scope.sendMessage = function() {
			Api.post('sendMessage', {
				message: $scope.modal.message,
				toUserId: params.channelId,
				userId: params.userId
			});
			$scope.modal.message = '';
			$scope.showNotification('success', 'Message sent to ' + $scope.user.friendlyName);
		};
		$scope.showNotification = function(type, message) {
			$scope.modal.notifying = true;
			$scope.modal.notificationType = type;
			$scope.modal.notificationMessage = message;
		};
		$scope.doAction = function(action) {
			$scope.modal.action = action;
			// Show flag options
			if (action.needsFlag) {
				$scope.modal.state = 'flagging';
			}
			// Show reason form
			else if (action.needsReason) {
				$scope.modal.state = 'suspending';
				$scope.modal.actionOptions = config.settings[action.actionOptions];
			}
			// Link out to the admin page
			else if (action.actionId === "1099511627776") {
				// Open admin link
				var path = action.actionPath || 'users.php?userId=' + params.channelId;
				var url = config.settings.ServerSecureLocalBaseUrl + '/administrator/' + path;
				window.open(url, '_blank');
			}
			// Submit the action immediately
			else {
				$scope.submitAction();
			}
		};

		$scope.submitAction = function() {
			if ($scope.modal.reasonForm && !$scope.modal.reasonForm.$valid) {
				Api.triggerTooltip('reason-form-tooltip', 2000);
				return false;
			}

			if ($scope.modal.state === 'flagging' && $scope.modal.flag === undefined) {
				Api.triggerTooltip('flagging-tooltip', 2000);
				return false;
			}

			var apiParams = {
				actionId: $scope.modal.action.actionId,
				userId: params.userId,
				onUserId: $scope.user.userId
			};

			var apiData = {
				url: 'php/api/doAdminAction',
				method: 'post',
				data: apiParams
			};

			if ($scope.modal.reasonOption) {
				apiParams.banReasonId = $scope.modal.reasonOption;
			}
			if ($scope.modal.action.needsFlag) {
				if ($scope.modal.flag === undefined) {
					return false;
				}
				apiParams.flagId = $scope.modal.flag;
			}
			if ($scope.modal.action.needsReason) {
				if (!$scope.modal.reason) {
					return false;
				}
				apiParams.reason = $scope.modal.reason;
			}
			if ($scope.modal.action.needsFlag || $scope.modal.action.needsReason) {
				// Send extra data
				if (params.broadcastId) {
					apiParams.broadcastId = params.broadcastId;
				}
				if (params.comment) {
					apiParams.comment = params.comment;
				}
				apiParams.broadcaster = params.broadcastRelated ? 1 : 0;
			}

			var video = document.getElementById('flashObj1');

			// if there is a video, send with snapshot, otherwise, just send the flag
			if (video !== null && (apiData.data.flagId === 2 || apiData.data.flagId === 5) && !params.sf) {
				eventbus.subscribe('swf:snapshot', function(event, image) {
					if (image) {
						var jpg = Api.base64ToFile('data:image/jpeg;base64,' + image);
						doAdminAction(apiData, jpg);
					}
				}, 'profileSummary', $scope);
				swf.invokeSwfMethod('getSnapshot', false);
			} else if (params.sf && apiData.data.flagId === 2) {
				apiParams.sf = params.sf;
				doAdminAction(apiData);
			} else {
				doAdminAction(apiData);
			}
		};

		$scope.goToProfile = function(profileName, event) {
			if (event && event.which === 2) {
				event.preventDefault();
				return false;
			}
			$modalInstance.close();
			$location.path(profileName + '/channel');
		};


		$scope.showProfileSummary = function(id) {
			if (!id) {
				return false;
			}
			$modalInstance.close();
			$timeout(function() {
				$modal.profileSummary(id);
			}, 500);
		};

		$scope.followUser = function() {
			$scope.modal.state = 'follow-notify';
		};

		$scope.modal.resetProfileSummary = function() {
			$scope.modal.notifying = undefined;
			$scope.modal.state = '';
			$scope.modal.reasonOption = undefined;
			$scope.modal.reason = undefined;
		};

		$scope.toggleDropdown = function($event) {
			if ($event) {
				$event.preventDefault();
				$event.stopPropagation();
			}
			if ($scope.modal.notifying) {
				$scope.modal.notifying = undefined;
			}
			$scope.modal.flagging = !$scope.modal.flagging;
		};

		$scope.closeOnInvite = function() {
			$modalInstance.close();
		};

		//submits flag, adds image if there is one
		var doAdminAction = function(apiData, image) {
			if (image) {
				apiData.data.image = image;
				upload(apiData).then(function(response) {
					handleAdminActionResponse(response);
				});
			} else {
				upload(apiData).then(function(response) {
					handleAdminActionResponse(response);
				});
			}
		};

		//displays success and failure modals
		var handleAdminActionResponse = function(response) {
			if (response.data.errorCode === 0) {
				$scope.showNotification('success', 'Success');
				if ($scope.modal.action.actionName === 'Block' || $scope.modal.action.actionName === 'Unblock') {
					getUserActions();
				}
			} else {
				$scope.showNotification('error', response.data.errorMsg);
			}
		};

	}]);
