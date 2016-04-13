angular.module('younow.channel.audience-panel', [])

.controller('AudiencePanelCtrl', ["$scope", "$modal", "$element", "$interval", "$timeout", "session", "swf", "config", "Api", "trackingPixel", function($scope, $modal, $element, $interval, $timeout, session, swf, config, Api, trackingPixel) {
	var vm = this,
		audiencelistEl = angular.element(document.getElementById('audiencelist')),
		audiencePages,
		previousScroll = 0,
		scrollDirection = 1,
		messageAnimation = [];

	vm.swf = swf;
	vm.session = session;
	vm.baseImageUrlv3 = config.settings.ServerCDNBaseUrl + '/angularjsapp/src/assets/images/icons_v3';
	vm.thumb = config.settings.ServerCDNBaseUrl + '/php/api/channel/getImage/channelId=';
	vm.noThumb = config.settings.ServerCDNBaseUrl + '/images/nothumb.jpg';
	vm.messageNumberInView = 0;
	vm.globalVars = window.globalVars;
	vm.config = config;

	swf.audienceLists.currentPage = 0;

	trackingPixel.trackClick('AUDIENCE');

	vm.openProfileSummary = function(id, source) {
		$modal.profileSummary(id, {
			source: source
		});
	};

	vm.scrollLoadAudience = function(isRefresh, pageNum) {
		if (swf.audienceLists.hasNext) {
			if (!swf.audienceLists.loading && !isRefresh) {
				vm.swf.getAudience(pageNum, 20, false);
			}
		}
	};

	vm.clickToRefresh = function() {
		vm.swf.getAudience(swf.audienceLists.currentPage, 20, true);
	};

	audiencelistEl.on('scroll', function() {
		var pages = audiencelistEl.children(),
			totalHeight = audiencelistEl[0].scrollTop;

		//direction
		if (previousScroll < audiencelistEl[0].scrollTop) {
			scrollDirection = 1;
		}
		if (previousScroll > audiencelistEl[0].scrollTop) {
			scrollDirection = 0;
		}
		previousScroll = audiencelistEl[0].scrollTop;
		//lazy load
		if ((audiencelistEl[0].scrollHeight - Math.round(audiencelistEl.scrollTop())) <= audiencelistEl[0].offsetHeight) {
			vm.scrollLoadAudience(false, pages.length, false);
		}

		//reset pages if user scrolls too fast to the top
		if (audiencelistEl[0].scrollTop === 0) {
			swf.audienceLists.currentPage = 0;
		}

		//checks if the element is visible, if so any actions (refreshing) is done to that 'page'.
		for (var i = 0; i < pages.length; i++) {
			var page = angular.element(pages[i]),
				top = page.prop('offsetTop');

			if (audiencelistEl.scrollTop() > top && audiencelistEl.scrollTop() < (950 * (i + 1))) {
				swf.audienceLists.currentPage = i;
				//scrolling up refresh
				if (scrollDirection === 0 && swf.audienceLists.prevLoadedPage > swf.audienceLists.currentPage) {
					swf.getAudience(swf.audienceLists.currentPage, 20, true);
				}
				//scrolling back down refresh
				if (scrollDirection === 1 && swf.audienceLists.prevLoadedPage < swf.audienceLists.currentPage) {
					swf.getAudience(swf.audienceLists.currentPage, 20, true);
				}
			}
		}
	});

	$scope.$on('$destroy', function() {
		audiencelistEl.off('scroll');
	});

}])

.directive('audiencePanel', ["broadcasterService", function(broadcasterService) {
	return {
		restrict: 'A',
		templateUrl: 'angularjsapp/src/app/components/audience-panel/audience-panel.tpl.html',
		controller: 'AudiencePanelCtrl',
		controllerAs: 'vm',
		scope: {},
		link: function(scope, element, attrs, controller) {
			var vm = controller;

			//once this element gets destroyed make sure to stop the calls to refresh the audience.
			angular.element(element).on('$destroy', function() {
				if (vm.swf.activeChatTab !== 'Chat' && broadcasterService.async === true) {
					vm.swf.activeChatTab = 'Chat';
				}
				vm.swf.audienceLists = null;
				vm.swf.audienceLists = {};
			});
		}
	};
}])

.directive('audienceMessage', ["$interval", "swf", "session", "$filter", function($interval, swf, session, $filter) {
	return {
		restrict: 'A',
		scope: {
			viewer: '='
		},
		link: function(scope, element, attrs, controller) {
			var vm = controller,
				messageAnimation,
				isBroadcaster = swf.broadcast.userId === session.user.userId;

			scope.viewer.messages = [];

			scope.viewer.subscriptionDate = $filter('date')(scope.viewer.subscriptionDateUNIX, 'MM/dd/yyyy');

			//find out the messages and relevance
			if (scope.viewer.subscriptionType && scope.viewer.messages.length < 3) {
				scope.viewer.messages.push('subscriber');
			}

			if (scope.viewer.fanRank !== -1 && scope.viewer.messages.length < 3) {
				scope.viewer.messages.push('fanRank');
			}

			if (scope.viewer.fanRank === -1 && isBroadcaster && scope.viewer.messages.length < 3) {
				scope.viewer.messages.push('isFan');
			}

			if (scope.viewer.birthdayCopy && isBroadcaster && scope.viewer.messages.length < 3) {
				scope.viewer.messages.push('birthday');
			}

			if (scope.viewer.gifts > 0 && scope.viewer.messages.length < 3) {
				scope.viewer.messages.push('gifts');
			}

			if (scope.viewer.viewersRs > 0 && scope.viewer.messages.length < 3) {
				scope.viewer.messages.push('viewersRs');
			}

			if ((scope.viewer.location.city.length > 0 || scope.viewer.location.state.length > 0 || scope.viewer.location.country.length > 0) && scope.viewer.messages.length < 3) {
				scope.viewer.messages.push('location');
			}

			if (scope.viewer.fans && scope.viewer.messages.length < 3) {
				scope.viewer.messages.push('fans');
			}

			function startAudienceMessageInterval() {
				scope.viewer.messageNumberInView = 0;
				rotateMessages(scope.viewer.messages[scope.viewer.messageNumberInView]);
				messageAnimation = $interval(function() {
					if (scope.viewer.messageNumberInView === scope.viewer.messages.length - 1) {
						scope.viewer.messageNumberInView = 0;
					} else {
						scope.viewer.messageNumberInView++;
					}
					rotateMessages(scope.viewer.messages[scope.viewer.messageNumberInView]);
				}, 3500);
			}

			function rotateMessages(message) {
				for (var i = 0; i < scope.viewer.messages.length; i++) {
					if (scope.viewer.messages[i] === message) {
						angular.element(element).addClass(scope.viewer.messages[i] + '-active');
					} else {
						angular.element(element).removeClass(scope.viewer.messages[i] + '-active');
					}
				}
			}

			//animate through messages
			startAudienceMessageInterval();

			//clean up
			scope.$on('$destroy', function() {
				$interval.cancel(messageAnimation);
			});

		}
	};
}]);
