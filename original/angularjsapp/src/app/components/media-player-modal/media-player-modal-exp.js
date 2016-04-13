angular.module('younow.modals.media-player-modal-exp', [])

.controller('MediaPlayerModalExpCtrl', ["$rootScope", "$scope", "$modalInstance", "config", "Api", "session", "broadcastId", "trackingPixel", "$interval", "$timeout", "$state", "params", "broadcast", "broadcasterService", "swf", "$window", "$modal", function($rootScope, $scope, $modalInstance, config, Api, session, broadcastId, trackingPixel, $interval, $timeout, $state, params, broadcast, broadcasterService, swf, $window, $modal) {
	// broadcasteId should be Array
	console.log('BS1', bs, broadcastId);
	var bs = broadcastId;
	broadcastId = bs.shift();

	var vm = this,
		player,
		onbeforeunloadChannel;

	onbeforeunloadChannel = window.onbeforeunload;

	$scope.session = session;

	// playtime
	var ptSeconds = 0;
	var ptInterval;

	// params.source is required, otherwise assuming it's deep-link
	if (params && params.start !== undefined) {
		$state.params.copy = params.start;
		delete params.start;
	}

	vm.channel = {};
	vm.broadcast = {};
	trackingPixel.archiveActive = true;
	if (!window.YouNow.track.pageFirst) {
		window.waitForPageType = false;
		$rootScope.gaPage({
			pageType: 'archived broadcast'
		});
	}

	// init
	console.log('BS2', bs, broadcastId);
	var initLast = function(broadcastId) {
		Api.get('broadcast/videoPath', {
				broadcastId: broadcastId
			}, true)
			.then(function(response) {
				if (response.data.errorCode) {
					// try next
					if (bs && bs[0]) {
						broadcastId = bs.shift();
						initLast(broadcastId);
						return false;
					}
					// fail
					var errorMsg = 'Error: ' + response.data.errorCode + '<br />' + response.data.errorMsg + '';
					if (response.data.errorCode == 248) {
						errorMsg = '<b style="color:#111;">We\'re sorry; this broadcast has not yet finished saving (encoding) to a video file.</b><br />Check back later, and please note that this may take a while if it was a very long broadcast.';
					}
					window.$('.modal-content').html('<table style="height:100%;width:100%;"><tbody><tr><td style="color: #666;text-align: center;">' + errorMsg + '</td></tr></tbody></table>');
					console.warn('broadcast/videoPath', response.data.errorCode, response.data.errorMsg);
				} else {

					// mute
					swf.oldVolume = swf.volume || 100;
					swf.volume = 0;
					swf.setMiniPlayerVolume();

					// broadcast
					vm.broadcast = broadcasterService.channelFormat(response.data, broadcast);
					vm.broadcast.broadcastId = vm.broadcast.broadcastId || broadcastId;
					vm.broadcast.downloadUrl = broadcasterService.getDownloadUrl(vm.broadcast.broadcastId);

					// player
					jwplayer.key = config.settings.JW_PLAYER_KEY;
					var file = vm.broadcast.server + vm.broadcast.stream + '?sessionId=' + session.user.session;
					var files = [{
						file: file
					}];
					var playerOptionsExp = {
						file: file,
						levels: files,
						image: config.settings.ServerCDNBaseUrl + '/php/api/getBroadcastThumb/broadcastId=' + broadcastId,
						width: '592',
						height: '444',
						autostart: false,
						flashplayer: 'js/jwplayer6.7/jwplayer.flash.swf',
						controlbar: {
							position: 'bottom'
						},
						logo: {
							file: config.settings.ServerCDNBaseUrl + '/images/jwlogo4.png',
							position: 'bottom-left',
							margin: '0'
						},
						events: {
							onError: function(data) {
								$scope.gaEvent('Broadcast Player', 'playbackError', 'Profile Broadcasts');
							},
							onReady: function(data) {},
							onPlay: function(data) {
								// login?
								if (!vm.broadcast.loginAttempted && !session.user.userId) {
									window.jwplayer("media-player-modal-player-expplayer").pause();
									vm.broadcast.loginAttempted = true;
									$modal.loginModal('', 'POST').result.then(function() {
										window.jwplayer("media-player-modal-player-expplayer").play();
									}).catch(function() {
										window.jwplayer("media-player-modal-player-expplayer").play();
									});
								}
								if (!vm.seekInterval) {
									player = jwplayer("media-player-modal-player-expplayer");
									vm.seekInit();
								}
								if (!ptInterval) {
									ptInterval = $interval(function() {
										ptSeconds++; // watched for a second
									}, 1000);
								}
							},
							onPause: function(data) {
								$interval.cancel(ptInterval);
								ptInterval = false;
								ptSeconds++; // round up to next second
							}
						}
					};
					jwplayer("media-player-modal-player-expplayer").setup(playerOptionsExp);


					// channel
					Api.get('channel/getInfo', {
							channelId: vm.broadcast.userId
						}, true)
						.then(function(response) {
							// error
							if (response.data.errorCode) {
								console.warn('channel/getInfo', response.data.errorCode, response.data.errorMsg);
								// ok
							} else {
								vm.channel = broadcasterService.channelFormat(response.data);
								// referralCode
								swf.snapshotLinks({
									'broadcast': vm.broadcast
								}).then(function(data) {
									vm.links = data;
									vm.broadcast.sharePath = data.COPIEDURL;
									vm.broadcast.shareTitle = vm.broadcast.broadcastTitle.replace(/\s/g, '-') + '';
									vm.broadcast.href = vm.broadcast.sharePath + '/' + vm.broadcast.shareTitle;
								});
							}
						});
				}
			});
	};
	initLast(broadcastId);


	// SEEK >>>

	vm.seekClick = function($event) {
		player.seek(vm.broadcast.length * vm.broadcast.offsetXFraction);
	};

	vm.seekMove = function($event) {
		if ($event.offsetX && $event.offsetX > 0.01) {
			vm.broadcast.offsetX = $event.offsetX;
			vm.broadcast.offsetXFraction = ($event.offsetX / 592);
			vm.broadcast.offsetXString = seekSecsToString(parseInt(vm.broadcast.length * vm.broadcast.offsetXFraction));
		}
	};

	// helpers
	var seekSecsToString = function(secs) {
		// format
		var hrs = (Math.floor(secs / 3600) || '') + '';
		var hrs_ = '';
		if (hrs) {
			hrs_ = ':';
		}
		var min = (Math.floor((secs % 3600) / 60) || '0');
		var _min = '';
		if (min < 10 || min == '0') {
			_min = '0';
		}
		var min_ = ':';
		var _sec = '';
		var sec = (secs % 60) || '0';
		if (sec < 10 || sec == '0') {
			_sec = '0';
		}
		// set
		var string = hrs + hrs_ + _min + min + min_ + _sec + sec;
		// done
		return string;
	};
	var seekStringToSecs = function(str) {
		var num = 0; // seconds integer
		var arr = str.split(':'); // 00:00:00
		var re = 0; // remainder to next higher tier -> 00:60 = 01:00
		if (arr[0]) {
			arr = arr.reverse();
			var i = 0;
			while (i < 3) { // sec, min, hrs
				// format
				var nu = re + (parseInt(arr[i]) || 0);
				re = 0;
				if (nu > 59) {
					re = Math.floor(nu / 60);
					nu = nu % 60;
				}
				// add
				num += nu * Math.pow(60, i);
				// next
				i++;
			}
		}
		return num;
	};
	var seekStringToString = function(str) {
		if (!str || str.indexOf(',-') > -1) {
			return '00:00';
		}
		str = str.replace(/[^\d:]/g, '');
		var sec = seekStringToSecs(str);
		if (sec) {
			str = seekSecsToString(sec);
			return str;
		} else {
			return '00:00';
		}
	};

	// pre (prevents blank value flash on load)
	vm.seekOn = false;
	vm.seekString = vm.seekValue = vm.broadcast.seekString = seekStringToString($state.params.copy);
	vm.seekInitial = vm.seekSec = seekStringToSecs(vm.seekString);

	// track
	if ($state.params.copy) {
		$rootScope.gaEvent('FEATURE', 'archived_seek', $state.params.copy);
	}

	// start
	vm.seekInit = function() {
		vm.seekOn = false;
		vm.seekString = vm.seekValue = vm.broadcast.seekString = seekStringToString($state.params.copy);
		vm.seekInitial = vm.seekSec = seekStringToSecs(vm.seekString);

		if (vm.seekSec) {
			player.seek(vm.seekSec);
		}
		vm.seekWatch();
		if (player.getDuration() > 2) {
			player.onComplete(vm.seekReset);
		}

		player.setMute(false);
		player.setVolume(50);

		$state.params.copy = '';
	};
	vm.seekReset = function() {
		$interval.cancel(vm.seekInterval);
		player.seek(0);
		$timeout(function() {
			vm.seekInit();
		}, 500);
		$timeout(function() {
			if (player.getDuration() >= 0) {
				player.pause();
			}
		}, 1000);
	};
	// interval
	vm.seekWatch = function() {
		vm.seekInterval = $interval(function() {

			vm.seekSec = Math.floor(player.getPosition());
			vm.broadcast.positionXFraction = vm.seekSec / vm.broadcast.length;
			vm.broadcast.positionX = vm.broadcast.positionXFraction * 593;
			vm.broadcast.positionXString = seekSecsToString(parseInt(vm.seekSec));

			if (!vm.seekOn) {
				vm.seekString = seekSecsToString(vm.seekSec);
				vm.seekValue = vm.seekString;
				vm.broadcast.href = vm.broadcast.sharePath + '/' + vm.broadcast.shareTitle;
			} else {
				vm.broadcast.href = vm.broadcast.sharePath + '/' + vm.seekValue;
			}

		}, 1000);
	};

	// checkbox
	vm.seekCheck = function() {
		if (!vm.seekOn) {
			vm.broadcast.seekString = null;
			vm.broadcast.href = vm.broadcast.sharePath + '/' + vm.broadcast.shareTitle;
			//player.play(true);
		} else {
			vm.broadcast.seekString = vm.seekString;
			vm.broadcast.href = vm.broadcast.sharePath + '/' + vm.broadcast.seekString;
			//player.pause(true);
		}
	};
	// input: focus
	vm.seekFocus = function() {
		vm.seekOn = true;
		vm.seekValueBefore = vm.seekValue;
	};
	// input: change
	vm.seekChange = function() {
		vm.seekOn = true;
		$timeout.cancel(vm.seekValueTimeout);
		vm.seekValueTimeout = $timeout(vm.seekBlur, 2000);
	};
	// input: blur
	vm.seekBlur = function() {
		if (vm.seekValueBefore != vm.seekValue) {
			var str = vm.seekValue = seekStringToString(vm.seekValue);
			var sec = seekStringToSecs(str);
			player.seek(sec);
		}
	};

	// <<< SEEK


	// Share
	// /profile/channel/user
	vm.shareFacebook = function() {
		FB.ui({
			method: 'share',
			href: vm.links.FACEBOOK,
		});
	};
	vm.shareTwitter = function() {
		var go = 'https://twitter.com/intent/tweet?text=I just watched an awesome %23YouNow broadcast. ' + vm.links.TWITTER;
		Api.openPopup('Tweet', go);
	};

	// Scope
	$scope.vm = vm;

	// Track
	var trackClose = function() {
		trackingPixel.archiveActive = false;
		// Track
		return trackingPixel.capture({
			event: 'ARCHIVE_VIEW',
			points: ptSeconds,
			broadcastid: vm.broadcast.broadcastId,
			extradata: ((vm.seekInitial > 0 || !params.source) ? 'DEEP' : params.source),
			sourceid: (vm.seekInitial || 0)
		});
	};
	// on off
	$scope.$on('$destroy', function() {
		// if (!window.YouNow.archivedBroadcastContinue) {
		// 	window.YouNow.archivedBroadcastContinue = {};
		// }
		// window.YouNow.archivedBroadcastContinue[ vm.broadcast.broadcastId ] = vm.seekValue;
		swf.volume = swf.oldVolume || 100;
		swf.setMiniPlayerVolume();

		$interval.cancel(ptInterval);
		$interval.cancel(vm.seekInterval);
		trackClose('channel', {});
		$window.onbeforeunload = onbeforeunloadChannel;
		onbeforeunloadChannel = null;
	});
	// off window
	$window.onbeforeunload = function(e) {
		trackClose('channel', {});
	};
}]);
