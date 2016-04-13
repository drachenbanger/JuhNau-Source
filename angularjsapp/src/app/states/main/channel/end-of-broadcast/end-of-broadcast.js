angular.module('younow.channel.end-of-broadcast', [])

.config(["$stateProvider", function config($stateProvider) {
	$stateProvider
		.state('main.channel.detail.endOfBroadcast', {
			controller: 'EndOfBroadcastCtrl',
			controllerAs: 'vm',
			templateUrl: 'angularjsapp/src/app/states/main/channel/end-of-broadcast/end-of-broadcast.tpl.html',
			url: ''
		});
}])


.controller('EndOfBroadcastCtrl', function(swf, Api, broadcasterService, session, config, $modal, $state, $scope, guestService, eventbus) {
	var vm = this;
	var index = 0;
	var count = 10;
	var fanData = {
		fan: 1,
		list: []
	};
	vm.Api = Api;
	vm.swf = swf;
	vm.session = session;
	vm.broadcast = broadcasterService;
	vm.thumb = config.settings.ServerCDNBaseUrl + '/php/api/channel/getImage/channelId=';
	vm.noThumb = config.settings.ServerCDNBaseUrl + '/images/nothumb.jpg';
	vm.config = config;
	vm.settings = config.settings;
	vm.needsTipalti = null;
	vm.fanned = false;
	vm.message = null;
	vm.supporterList = [];
	vm.sentThanks = false;
	session.isBroadcasting = false;
	swf.currentSession.isBroadcasting = false;
	swf.settingUpBroadcast = false;
	swf.fromEob = true;
	var currentBroadcaster = null;

	vm.openAgreement = function() {
		$modal.partnerAgreement();
	};

	vm.goToMainState = function() {
		resetEob();
		if ($state.current.name !== 'main.channel.detail') {
			$state.go('main.channel.detail').then(function() {
				swf.loadNextChannel(currentBroadcaster);
			});
		}
	};

	vm.goToTag = function(tag) {
		resetEob();
		$state.go('main.explore', {
			tag: tag
		});
	};

	vm.fanAll = function() {
		if (vm.fanned === false) {
			var postRequest = Api.post('/broadcast/fanSupporters', {
				userId: vm.session.user.userId,
				broadcastId: swf.broadcast.broadcastId
			});
			postRequest.then(function(response) {
				vm.fanned = true;
				eventbus.notifySubscribers('fanbutton:updateUI', fanData);
				fanData.list = [];
			});
		}
	};

	vm.thankAll = function() {
		// var result = extractMentions();
		var html = angular.element(document.getElementById('thanksComment'));
		var text = angular.element("<p>" + html.text() + "</p>").text(); // Strip pasted & written html
		if (html.text().length > 0) {
			// if (result) {
			// 	if (text.length > 500) {
			// 		text = (text.substr(0, 499));
			// 	}
			// 	var postRequest = Api.post('/broadcast/thankSupporters', {
			// 		userId: session.user.userId,
			// 		broadcastId: swf.broadcast.broadcastId,
			// 		post: text
			// 		// mentioned: result.join(',')
			// 	});

			// 	postRequest.then(function(response) {
			// 		if (response.data.errorCode === 0) {
			// 			vm.sentThanks = true;
			// 		}
			// 	});
			// } else {
				var request = Api.post('/broadcast/thankSupporters', {
					userId: session.user.userId,
					broadcastId: swf.broadcast.broadcastId,
					post: text
				});
				request.then(function(response) {
					if (response.data.errorCode === 0) {
						vm.sentThanks = true;
					}
				});
			// }
		}
	};

	vm.loadMoreSupporters = function() {
console.log(vm.swf.eob.supportersCount);
		console.log(vm.supporterList.length);
		if (vm.swf.eob.supportersCount > vm.supporterList.length) {
			console.log(vm.swf.eob.supportersCount);
		console.log(vm.supporterList.length);
			var userId;
			var getRequest = Api.get('/broadcast/getSupporters', {
				userId: vm.session.user.userId,
				broadcastId: swf.broadcast.broadcastId,
				start: index,
				count: count
			});
			getRequest.then(function(response) {
				if (response.data.errorCode === 0) {
					vm.supporterList.push(response.data.supporters);
					vm.supporterList = [].concat.apply([], vm.supporterList);
					for (var i in response.data.supporters) {
						fanData.list.push(response.data.supporters[i].userId);
					}
					index += count;
					if (vm.fanned === true) {
						eventbus.notifySubscribers('fanbutton:updateUI', fanData);
						fanData.list = [];
					}
				}
			});
		}
	};

	// vm.searchPeople = function(term) {
	// 	Api.algolia(term).success(function(data) {
	// 		angular.forEach(data.hits, function(user, i) {
	// 			user.displayName = Api.fullName(user);
	// 			user.thumb = config.settings.ServerCDNBaseUrl + '/php/api/channel/getImage/channelId=' + user.objectID;
	// 		});
	// 		vm.people = data.hits;
	// 	});
	// };

	// vm.insertMention = function(item) {
	// 	vm.people = undefined;
	// 	return '<span class="mention-highlight" contenteditable="false" person="' + item.objectID + '">' + item.displayName + '</span>';
	// };

	// function extractMentions() {
	// 	var mentions;
	// 	var spans = document.getElementsByClassName('mention-highlight');
	// 	if (spans.length) {
	// 		mentions = [];
	// 		angular.forEach(spans, function(span) {
	// 			var mention = angular.element(span);
	// 			mentions.push(mention.text() + ':' + mention.attr('person'));
	// 			mention.text('@' + mention.text());
	// 		});
	// 	}
	// 	return mentions;
	// }

	function getSupporters() {
		var userId;
		var getRequest = Api.get('/broadcast/getSupporters', {
			userId: vm.session.user.userId,
			broadcastId: swf.broadcast.broadcastId
		});
		getRequest.then(function(response) {
			vm.supporterList = response.data.supporters;
			index += count;
			for (var i in vm.supporterList) {
				fanData.list.push(vm.supporterList[i].userId);
			}
		});
	}

	function resetEob() {
		if(swf.eob) {
			if ($state.current.name !== 'main.channel.detail') {
				currentBroadcaster = broadcasterService.broadcaster;
				broadcasterService.broadcaster = undefined;
			}
			delete swf.eob;
		}
		if (guestService.state != 'ready') {
			guestService.state = 'ready';
		}
	}

	$scope.$on('$destroy', function() {
		resetEob();
		if ($state.current.name === 'main.settings' || $state.current.name === 'main.explore') {
			return false;
		}
		vm.goToMainState();
	});

	getSupporters();

});
