angular.module('younow.post', [])

.directive('younowPost', function() {
	return {
		restrict: 'A', // Directive which is declared as an attribute
		replace: true, // Replace the element where the directive is declared
		templateUrl: 'angularjsapp/src/app/components/post/post.tpl.html',
		controller: 'YounowPostCtrl'
	};
})

.controller('YounowPostCtrl', ["$scope", "$http", "config", "Api", "session", "pusher", "broadcasterService", "$filter", "$translate", function($scope, $http, config, Api, session, pusher, broadcasterService, $filter, $translate) {

	// TODO: Pass the post data into directive, rather than assume it exists at $scope.post

	$scope.session = session;
	$scope.broadcasterService = broadcasterService;
	$scope.baseUrl = config.settings.ServerCDNBaseUrl;

	var init = function() {
		// check if post matches the allowed embedly domains
		if ($scope.post.media && $scope.post.media.embedly && !$scope.post.media.embedly.provider_url.match(Api.regexStore.embedlyWhiteList)) {
			$scope.$destroy();
		} else {
			$scope.post = $scope.preparePost($scope.post);
		}
	};

	$scope.preparePost = function(post) {
		if (post) {
			//post = prepareEmbedly(post);
			post = Api.replaceMentions(post);
			post.post = Api.convertEmoji(Api.linkify(post.post));
			post = setLikeStatus(post);
			post = prepareMedia(post);
			post.changeLikes = function(change) {
				post.likesCount = post.likesCount ? post.likesCount + change : change;
				post.like.type = 2;
				post = setLikeStatus(post);
			};

			post.post = Api.trustedHTML(post.post);

		}
		return post;
	};

	var prepareEmbedly = function(post) {
		if (post.media && post.media.embedly) {
			if (post.media.embedly.html) {
				post.embed = 'iframe';
			} else if (post.media.embedly.type === 'image') {
				post.embed = 'embedlyimage';
			} else if (post.media.embedly.type === 'link' && post.media.embedly.thumbnail_url) {
				post.embed = 'link';
			}
		}
		// Strip out any legacy HTML. Todo: less crude method...
		if (post.post.indexOf('<') > -1 && post.post.indexOf('>' > -1) && post.embed) {
			post.post = post.post.substr(0, post.post.indexOf('<'));
		}
		return post;
	};

	var prepareMedia = function(post) {
		if (post.media) {
			if (post.media.broadcast) {
				post.downloadUrl = broadcasterService.getDownloadUrl(post.media.broadcast.broadcastId);
			}
			if (post.media.type == '4') {
				post.embed = 'video';
			} else if (post.media.type == '5') {
				post.embed = 'archive';
				if (post.media.broadcast.broadcastLength) {
					post.media.broadcast.broadcastLengthNice = $filter('date')(post.media.broadcast.broadcastLength * 1000, 'mm:ss');
					if (post.media.broadcast.broadcastLength >= 3600) {
						post.media.broadcast.broadcastLengthNice = Math.floor(post.media.broadcast.broadcastLength / 3600) + ":" + post.media.broadcast.broadcastLengthNice;
					}
				}
			} else if (post.media.type == '6') {
				post.embed = 'snapshot';
			} else if (post.media.type == '1' || post.media.type == '2') {
				post.embed = 'uploadimage';
			}
		}
		return post;
	};

	var setLikeStatus = function(post) {
		if (!post.like) {
			post.like = {
				type: 0
			};
			post.likesCount = 0;
		}
		switch (post.like.type) {
			case 1: // Liked by one
				$translate('like_who', {
					value: Api.fullName(post.like.user)
				}).then(function(translated) {
					post.likeText = translated;
				});
				post.liked = false;
				break;
			case 2: // Liked by several
				$translate('like_you_others', {
					value: post.likesCount
				}).then(function(translated) {
					post.likeText = translated;
				});
				post.liked = false;
				break;
			case 3: // Liked by me
				$translate('like_you', {}).then(function(translated) {
					post.likeText = translated;
				});
				post.liked = true;
				break;
			case 4: // Liked by me and others
				if (post.likesCount === 2) {
					$translate('like_you_other', {}).then(function(translated) {
						post.likeText = translated;
					});
				} else {
					$translate('like_you_others', {
						value: post.likesCount
					}).then(function(translated) {
						post.likeText = translated;
					});
				}
				post.liked = true;
				break;
			default:
				post.likeText = '';
				post.liked = false;
		}
		return post;
	};

	var setLikeType = function(post) {
		if (!post.likesCount) {
			post.like.type = 0;
		} else if (!post.liked) {
			post.like.type = post.likesCount === 1 ? 1 : 2;
		} else {
			post.like.type = post.likesCount === 1 ? 3 : 4;
		}
		return post;
	};

	$scope.trustedSrc = function(src) {
		return Api.trustedSrc(src);
	};

	$scope.toggleLike = function(post) {

		if (!session.loggedIn) {
			session.showLoginModal('', 'POST_LIKE');
			return true;
		}

		var apiMethod;
		if (post.liked) {
			post.liked = false;
			post.likesCount--;
			apiMethod = 'post/unlike';
		} else {
			post.liked = true;
			post.likesCount++;
			apiMethod = 'post/like';
		}

		Api.post(apiMethod, {
			userId: session.user.userId,
			channelId: broadcasterService.channel.userId,
			id: post.id,
			isComment: post.parentId ? 1 : 0,
			socket_id: pusher.SDK.connection.socket_id
		});

		post = setLikeType(post);
		post = setLikeStatus(post);

	};

	$scope.togglePin = function(post) {
		var apiMethod;
		if (post.isPinned) {
			post.isPinned = false;
			apiMethod = 'post/unpin';
		} else {
			// Unpin first item, if pinned
			if (broadcasterService.channel && broadcasterService.channel.posts && broadcasterService.channel.posts[0]) {
				broadcasterService.channel.posts[0].isPinned = false;
			}
			post.isPinned = true;
			apiMethod = 'post/pin';
		}
		Api.post(apiMethod, {
			userId: session.user.userId,
			channelId: broadcasterService.channel.userId,
			id: post.id
		});
	};

	$scope.delete = function(post) {
		Api.post('post/delete', {
			userId: session.user.userId,
			channelId: broadcasterService.channel.userId,
			id: post.id,
			isComment: post.parentId ? 1 : 0
		});
	};

	$scope.moreComments = function(post) {
		var params = {
			postId: post.id,
			channelId: broadcasterService.channel.userId,
			numberOfRecords: 5,
			doEnrich: 1,
			startFrom: post.replies.length
		};
		if (session.loggedIn) {
			params.userId = session.user.userId;
		}
		Api.get('post/getComments', params).success(function(data) {
			if (data) {
				for (var i = (data.replies.length - 1); i >= 0; i--) {
					post.replies.unshift(data.replies[i]);
				}
				post.hasMore = data.hasMore;
			} else {
				Api.trackError("Empty post/getComments");
			}
		});
	};

	init();

}])

;
