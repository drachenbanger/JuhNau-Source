angular.module('younow.modals.media-player-modal', [])

.controller('MediaPlayerModalCtrl', ["$rootScope", "$scope", "$modalInstance", "config", "Api", "session", "broadcastId", "trackingPixel", "$interval", "$timeout", "$state", "params", "broadcast", "broadcasterService", "swf", "$window", "$modal", function($rootScope, $scope, $modalInstance, config, Api, session, broadcastId, trackingPixel, $interval, $timeout, $state, params, broadcast, broadcasterService, swf, $window, $modal) {
	var vm = this,
		player,
		onbeforeunloadChannel;

	onbeforeunloadChannel = window.onbeforeunload;

	$scope.session = session;

	// playtime
	var ptSeconds = 0;
	var ptInterval;

	// Track how long it takes to begin playback
	var archiveStartTime = new Date().getTime(),
		archiveLoadTime = 0,
		archiveLoadState = 'abandon',
		archiveReadyTime = 0,
		archiveWaitTime = 0,
		archiveStreamType,
		archiveSource,
		archiveServer,
		archiveErrorMsg = '';

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
	Api.get('broadcast/videoPath', {
			broadcastId: broadcastId
		}, true)
		.then(function(response) {
			archiveWaitTime = new Date().getTime() - archiveStartTime;
			if (response.data.errorCode) {
				var errorMsg = 'Error ' + response.data.errorCode + ': ' + response.data.errorMsg;
				if (response.data.errorCode == 248) {
					errorMsg = 'Sorry, this broadcast is not ready to replay. Check back soon!';
				}
				Api.showTopNotification(errorMsg);
				archiveLoadState = 'loadError';
				archiveErrorMsg = response.data.errorCode;
				$modalInstance.dismiss();
			} else if(!response.data.videoAvailable) {
				Api.showTopNotification('Sorry, this video is not available');
				archiveLoadState = 'loadError';
				archiveErrorMsg = 'noVideoAvailable';
				$modalInstance.dismiss();
			} else {
				// login?
				// if (!session.user.userId) {
				// 	$modal.loginModal('', 'POST').result.then(function() {
				// 		jwplayer("media-player-modal-player").play();
				// 	}).catch(function() {
				// 		jwplayer("media-player-modal-player").play();
				// 	});
				// }

				// detect wowza vs s3
				if(response.data.stream) {
					if(response.data.stream.indexOf('amazons3')!=-1) {
						archiveSource = 's3';
					} else if(response.data.stream.indexOf('wowza')!=-1) {
						archiveSource = 'wowza';
					} else {
						archiveSource = 'other';
					}
				}

				// detect server
				if(response.data.server) {
					archiveServer = response.data.server.split('/')[2].split('.')[2];
				}

				var hls = response.data.hls;
				var newHls;
				if(response.data.hls && response.data.hls.indexOf('ynassets')!=-1) {
					newHls = true;
				}

				// mute
				swf.oldVolume = swf.volume || 100;
				swf.volume = 0;
				swf.setMiniPlayerVolume();

				// broadcast
				vm.broadcast = broadcasterService.channelFormat(response.data, broadcast); // WARNING: is this needed? it overrides nodes like HLS from broadcast/videoPath
				vm.broadcast.broadcastId = vm.broadcast.broadcastId || broadcastId;
				vm.broadcast.downloadUrl = broadcasterService.getDownloadUrl(vm.broadcast.broadcastId);

				// player
				jwplayer.key = config.settings.JW_PLAYER_KEY;
				var rtmp = vm.broadcast.server + vm.broadcast.stream + '?sessionId=' + session.user.session;
				


				// Hackish split between RTMP and HLS to test
				var file;
				if(Math.random()>=0.9) {
					archiveStreamType = 'hls';
					file = hls;
				} else {
					archiveStreamType = 'rtmp';
					file = rtmp;
				}
				if(newHls) {
					if(Math.random()>=0.5) {
						archiveSource = 'ynassets';
						archiveStreamType = 'hls';
						file = hls;
					} else {
						archiveStreamType = 'rtmp';
						file = rtmp;
					}
				}
				file = hls; //test hardcode!

				var files = [{
					file: file
				}];
				var playerOptions = {
					file: file,
					levels: files,
					image: config.settings.ServerCDNBaseUrl + '/php/api/getBroadcastThumb/broadcastId=' + broadcastId,
					width: '592',
					height: '444',
					autostart: (params.experiment ? false : true),
					flashplayer: 'js/jwplayer6.7/jwplayer.flash.swf',
					html5player: 'js/jwplayer6.7/jwplayer.html5.js',
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
							archiveLoadState = 'playError';
							archiveErrorMsg = Api.pixelSafe(data.message, 300);
						},
						onReady: function(data) {
							archiveReadyTime = new Date().getTime() - archiveStartTime;
						},
						onPlay: function(data) {
							if (archiveLoadTime===0) {
								archiveLoadState = 'success';
								archiveLoadTime = new Date().getTime() - archiveStartTime;
								trackingPixel.capture({
									event: 'ARCHIVE_LOAD_TIME',
									coins: archiveLoadTime,
									broadcastid: vm.broadcast.broadcastId,
									extradata: ((vm.seekInitial > 0 || !params.source) ? 'DEEP' : params.source),
									sourceid: (vm.seekInitial || 0)
								});
							}
							if (!vm.seekInterval) {
								player = jwplayer("media-player-modal-player");
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
				jwplayer("media-player-modal-player").setup(playerOptions);

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
		// Track how long they waited before closing
		if (archiveLoadTime===0) {
			archiveLoadTime = new Date().getTime() - archiveStartTime;
		}
		// Track
		return trackingPixel.capture({
			event: 'ARCHIVE_VIEW',
			unspentcoins: archiveWaitTime,
			broadcastscount: archiveReadyTime,
			coins: archiveLoadTime,
			points: ptSeconds,
			broadcastid: broadcastId,
			extradata: ((vm.seekInitial > 0 || !params.source) ? 'DEEP' : params.source),
			sourceid: (vm.seekInitial || 0),
			field1: archiveLoadState,
			field2: archiveStreamType,
			field3: archiveSource,
			field4: archiveServer,
			field7: archiveErrorMsg
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

	// Log attempts to watch, in order to calculate abandonments
	trackingPixel.capture({
		event: 'ARCHIVE_ATTEMPT',
		broadcastid: broadcastId,
		extradata: ((vm.seekInitial > 0 || !params.source) ? 'DEEP' : params.source),
		sourceid: (vm.seekInitial || 0)
	});

}]);
