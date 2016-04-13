angular.module('younow.channel.share-panel', [])

.directive('sharePanel', function(swf, trackingPixel, shareService, guestService, Api, session, $modal, webRtc, guestService, upload, config) {
	return {
		restrict: 'A',
		templateUrl: 'angularjsapp/src/app/components/share-panel/share-panel.tpl.html',
		scope: {
			target: '@',
			closeCallback: '='
		},
		link: function(scope, element, attrs, controller) {
			scope.panel = {
				target: scope.target,
				post: {
					shared: false,
					sharing: false
				}
			};
			scope.panel.swf = swf;
			scope.panel.guestService = guestService;
			scope.panel.session = session;

			scope.panel.close = function() {
				scope.closeCallback();
			};

			scope.panel.newSnapshot = function() {
				if (scope.target == 'guest') {
					guestService.getSnapshot();
				} else {
					swf.getSnapshot();
					shareService.trackFunnel("snapshot");
				}
			};

			scope.panel.attemptShare = function(target) {
				//in case of guest we need to attach the snapshot to the swf service
				if (!swf.snapshot) {
					swf.snapshot = {
						snapshot: guestService.eobSnapshot
					};
				}

				if (target == 'invite') {
					trackingPixel.trackClick('INVITE');
				} else {
					trackingPixel.trackClick('SHARE', {
						field1: target.toUpperCase()
					});
				}
				if (target === 'post') {
					attemptPost();
					scope.panel.post.sharing = true;
				} else {
					scope.panel.share(target);
				}
				shareService.trackFunnel(target + "_attempt");

				if (!swf.snapshot.messageAdded && swf.broadcast.share_message) {
					shareService.trackFunnel("message");
					swf.snapshot.messageAdded = true;
				}
			};

			scope.panel.share = function(target) {
				if (!guestService.eobSnapshot && scope.target === 'guest') {
					guestService.getSnapshot();
				}

				if (!swf.snapshot && scope.target !== 'guest') {
					swf.getSnapshot();
				}

				// pre
				if (typeof scope.panel.swf.snapshot.shared != 'object') {
					swf.snapshot.shared = {};
				}
				if (typeof scope.panel.swf.snapshot.sharing != 'object') {
					swf.snapshot.sharing = {};
				}

				// no bc or user
				if (!scope.panel.swf.broadcast || !session.user) {
					return false;
				}
				//not logged in
				if (!session.loggedIn) {
					session.showLoginModal('', 'SHARE').result.then(function(response) {
						scope.panel.share(target);
					});
					return false;
				}

				//Lets start the loading animation to show feedback
				swf.snapshot.sharing[target] = true;

				// route
				if (target == 'facebook') {
					shareService.shareFacebook();
				}

				if (target == 'twitter') {
					shareService.shareTwitter()
						.then(function(response) {
							// success, don't do any logic here!
						})
						.catch(function(response) {
							if (response === "error") {
								if (!swf.snapshot.shared.twitter_login_attempted) {
									swf.snapshot.shared.twitter_login_attempted = true;
									scope.panel.share(target);
								}
							}
						});
				}

				if (target == 'tumblr') {
					shareService.shareTumblr()
						.then(function(response) {
							// success, don't do any logic here!
						})
						.catch(function(response) {
							if (response === "error") {
								if (!swf.snapshot.shared.tumblr_login_attempted) {
									swf.snapshot.shared.tumblr_login_attempted = true;
									scope.panel.share(target);
								}
							}
						});
				}

				if (target == 'invite') {
					//can only share once
					if (swf.broadcast.shared.younow) {
						Api.showTopNotification('You can only invite your fans to a broadcast once.');
						shareService.trackFunnel(target + "_duplicate");
						return false;
					}

					//requires the message, open the modal to get message
					if (swf.broadcast && (!swf.broadcast.share_message || swf.broadcast.share_message.length === 0)) {
						var modalInstance = $modal.shareBroadcast(swf.broadcast.share_message);

						modalInstance.result.then(function(response) {
							if (response && response.length > 0) {
								swf.broadcast.share_message = response;
								shareService.sendShare("younow", 1);
							}
						});
					} else {
						shareService.sendShare("younow", 1);
					}
					swf.snapshot.sharing[target] = false;
				}
			};

			function attemptPost() {
				//requires the message, open the modal to get message
				if (swf.broadcast && (!swf.broadcast.share_message || swf.broadcast.share_message.length === 0)) {
					var modalInstance = $modal.shareBroadcast(swf.broadcast.share_message);

					modalInstance.result.then(function(response) {
						if (response && response.length > 0) {
							swf.broadcast.share_message = Api.stripHTML(response);
							uploadPost();
						}
					});
				} else {
					//do post
					swf.broadcast.share_message = Api.stripHTML(swf.broadcast.share_message);
					uploadPost();
				}
			}

			function uploadPost() {
				var blob = Api.base64ToFile('data:image/jpeg;base64,' + guestService.eobSnapshot);
				var data = {
					post: swf.broadcast.share_message,
					parentId: 0,
					channelId: session.user.userId,
					userId: session.user.userId,
					doEnrich: 1,
					media: blob,
					tsi: Api.store('trpxId'),
					tdi: Api.store('trpx_device_id')
				};

				var apiData = {
					url: window.location.protocol + '//' + config.host + '/php/api/post/create',
					method: 'POST',
					data: data,
					headers: {
						'X-Requested-By': session.user.requestBy
					}
				};

				upload(apiData).then(function(response) {
					if (response.data.errorCode === 0) {
						scope.panel.post.shared = true;
						scope.panel.post.sharing = false;
					} else {
						scope.panel.post.shared = false;
						scope.panel.post.sharing = false;
					}
				});
			}

			scope.$on('$destroy', function() {
				if (guestService.eobSnapshot) {
					delete guestService.eobSnapshot;
				}
				if (swf.snapshot && scope.target !== 'guest') {
					swf.snapshot = null;
				}
			});
		}
	};
});
