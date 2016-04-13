angular.module('younow.miniPlayer', [])

.directive('miniPlayer', function($rootScope, $timeout, config, swf, broadcasterService, Api) {
	return {
		restrict: 'E',
		templateUrl: 'angularjsapp/src/app/components/mini-player/mini-player.tpl.html',
		scope: {
			playerId: '@'
		},
		link: function(scope, element, attr) {

			if (window.isPrerender) {
				return false;
			}

			scope.vm = {
				viewers: Api.squashedNumber(broadcasterService.broadcaster.viewers),
				likes: Api.squashedNumber(broadcasterService.broadcaster.likes),
				shares: Api.squashedNumber(broadcasterService.broadcaster.shares),
				enterChat: function() {
					broadcasterService.channelSwitch = "PROFILE";
					broadcasterService.switchAsync(false);
				}
			};
			scope.vm.broadcasterService = broadcasterService;
			scope.vm.swf = swf;
			jwplayer.key = config.settings.JW_PLAYER_KEY;
			var data = broadcasterService.broadcaster;
			// Player is setup fresh each time, in order to show loading image
			var stream_url = 'rtmp://' + data.media.host + data.media.app + '/' + data.media.stream;
			$timeout(function() {
				jwplayer('playeroniBsrErLcZk').setup({
					file: stream_url,
					width: 336,
					height: 252,
					autostart: "true",
					controls: false,
					aspectratio: '4:3',
					primary: 'flash',
					flashplayer: 'js/jwplayer6.7/jwplayer.flash.swf'
				});
				jwplayer('playeroniBsrErLcZk').setVolume(swf.volume);
				jwplayer('playeroniBsrErLcZk').onDisplayClick(function() {
					$rootScope.$evalAsync(function() {
						broadcasterService.switchAsync(false);
					});
				});
			});
		}
	};
});
