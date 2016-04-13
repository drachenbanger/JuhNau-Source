angular.module('younow.channel.player-header', [])

.controller('PlayerHeaderCtrl', ["$scope", "$element", "$modal", "$window", "swf", "Api", "broadcasterService", "session", "config", "$timeout", "eventbus", function($scope, $element, $modal, $window, swf, Api, broadcasterService, session, config, $timeout, eventbus) {

	var vm = this;
	vm.Api = Api;
	vm.swf = swf;
	vm.session = session;
	vm.broadcast = broadcasterService;
	vm.broadcast.chatMode = 0;
	vm.Math = $window.Math;
	vm.thumb = config.settings.ServerCDNBaseUrl + '/php/api/channel/getImage/channelId=';
	vm.noThumb = config.settings.ServerCDNBaseUrl + '/images/nothumb.jpg';
	vm.globalVars = window.globalVars;
	vm.config = config;

	vm.openBroadcasterProfile = function(id) {
		$modal.profileSummary(id);
	};

	// rank
	var rank_;
	var rank = 0;
	var showRank = function(eventName, args) {
		rank = args.rank;
		if (rank_ != rank) {
			vm.newRank = rank;
			$timeout(function() {
				vm.newRank = 0;
			}, 10000);
		}
		rank_ = rank;
	};
	eventbus.subscribe('BROADCASTER_RANK', showRank, 'player-header', $scope);

	// chatMode
	vm.chatModeToggle = function() {
		var setChatMode = vm.broadcast.chatMode ? 0 : 1;
		var post = {
			'userId': vm.session.user.userId,
			'channelId': vm.broadcast.broadcaster.userId,
			'chatMode': setChatMode
		};
		Api.post('broadcast/setChatMode', post).success(function(data) {
			if (!data.errorCode) {
				vm.broadcast.chatMode = setChatMode;
			} else {}
		});
	};

	$scope.vm = vm;
}])

.directive('playerHeader', function() {
	return {
		restrict: 'A',
		templateUrl: 'angularjsapp/src/app/components/video-player/player-header.tpl.html',
		controller: 'PlayerHeaderCtrl',
		controllerAs: 'vm',
		scope: {}
	};
})

;
