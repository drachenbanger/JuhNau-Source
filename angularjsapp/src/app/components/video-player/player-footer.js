angular.module('younow.channel.player-footer', [])

.controller('PlayerFooterCtrl', ["$scope", "swf", "session", "Api", "$timeout", "config", "$window", "shareService", "eventbus", "broadcasterService", "$rootScope", "trackingPixel", "webRtc", "$document", "guestService", "$modal", "externalStreamer", "$interval",
	function($scope, swf, session, Api, $timeout, config, $window, shareService, eventbus, broadcasterService, $rootScope, trackingPixel, webRtc, $document, guestService, $modal, externalStreamer, $interval) {
		var vm = this;
		vm.swf = swf;
		vm.session = session;
		vm.shareService = shareService;
		vm.config = config;
		vm.webRtc = webRtc;
		vm.isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
		vm.ffStreamAudioEnabled = false;
		vm.externalStreaming = externalStreamer.settings;

		//FLASH (TODO: remove this once flash is dead.)
		vm.broadcastSettings = {
			setCamera: function(index, camera) {
				swf.invokeSwfMethod('setCamera', index);
			},
			setMicrophone: function(index) {
				swf.invokeSwfMethod('setMicrophone', index);
			},
			cameraSetup: function() {
				var cameraSettings = swf.invokeSwfMethod('cameraSetup'),
					i = 0;

				vm.cameraOptions = [];
				for (i; i < cameraSettings.cameras.length; i++) {
					vm.cameraOptions.push({
						name: cameraSettings.cameras[i],
						current: cameraSettings.currentCamera === cameraSettings.cameras[i] ? true : false
					});
				}
			},
			microphoneSetup: function() {
				var microphoneSettings = swf.invokeSwfMethod('microphoneSetup'),
					i = 0;

				vm.microphoneOptions = [];
				for (i; i < microphoneSettings.microphones.length; i++) {
					vm.microphoneOptions.push({
						name: microphoneSettings.microphones[i],
						current: microphoneSettings.currentMicrophone === microphoneSettings.microphones[i] ? true : false
					});
				}
			}
		};
		//WEB RTC
		vm.RTCbroadcastSettings = {
			setCamera: function(camera) {
				webRtc.changeCamera(camera);
			},
			setMicrophone: function(microphone) {
				webRtc.changeMicrophone(microphone);
			},
			cameraSetup: function() {
				var options = webRtc.getMediaDevices();
				vm.cameraOptions = options.video;
			},
			microphoneSetup: function() {
				var options = webRtc.getMediaDevices();
				vm.microphoneOptions = options.audio;
			},
			ffMediaSetup: function() {
				if (!webRtc.getCurrentConfig().webrtcStream) {
					webRtc.initialize(webRtc.pc.onicecandidate)
						.then(
							function() {
								//success
								window.YouNow.App.cameraReady();
							},
							//error
							function() {
								$modal.alert("You must allow camera access to broadcast. You can edit this in your browser settings.");
							}
						);
				} else {
					webRtc.ffMediaSetup();
				}

			},
			ffMuteStream: function() {
				vm.ffStreamAudioEnabled = webRtc.ffMuteStream();
			}
		};

		vm.showFfMuteControls = function() {
			return (vm.isFirefox && (isGuest() || (session.isBroadcasting && config.mcu == "1")));
		};

		vm.likeStyle = function() {
			if (!vm.swf.broadcast) {
				return {};
			}
			var color,
				rotation,
				background = "#f6faf1",
				fill = "#d1e6ba";
			if (vm.swf.broadcast.likePercent <= 50) {
				color = background;
				rotation = (vm.swf.broadcast.likePercent * 3.6) - 90;
			} else {
				color = fill;
				rotation = (vm.swf.broadcast.likePercent * 3.6) - 270;
			}
			return {
				"background": "linear-gradient(" + rotation + "deg, " + color + " 50%, transparent 50%) 0 0, linear-gradient(90deg, " + background + " 50%, " + fill + " 50%) 0 0"
			};
		};

		vm.doLike = function(e) {
			trackingPixel.trackClick('LIKE');
			if (vm.cooldown) {
				return false;
			}
			if (!session.loggedIn) {
				session.showLoginModal('', 'LIKE').result.then(function() {
					vm.doLike(e);
				});
				return false;
			}
			if (swf.settingUpBroadcast) {
				session.preventBroadcastInterrupt();
				return false;
			} else if (session.checkBan()) {
				return false;
			} else {
				// Disable button for a short period, based on crazy formula
				vm.cooldown = true;
				$timeout(function() {
					vm.cooldown = false;
				}, 6000);
				// Update variables
				swf.broadcast.likes = Api.squashedNumber(Number(swf.broadcast.likes.replace(/\,/g, '')) + 1);
				session.user.userCoins = session.user.userCoins - swf.broadcast.nextLikeCost;
				Api.post('broadcast/like', {
					channelId: swf.broadcast.userId,
					userId: session.user.userId
				}).success(function(data) {
					swf.broadcast.nextLikeCost = data.nextLikeCost;
				});
			}
		};

		vm.clipboardMessage = "Copy Link";

		vm.clipboardCopied = function() {
			vm.clipboardMessage = "Copied!!";
			$timeout(function() {
				vm.clipboardMessage = "Copy Link";
			}, 3000);
		};

		vm.likeTooltip = function() {
			return swf.broadcast ? "<i class='yncoin ynicon ynicon-coins'></i>" + swf.broadcast.nextLikeCost : '';
		};

		vm.setVolume = function(e) {
			if (session.isBroadcasting || swf.settingUpBroadcast || isGuest()) {
				swf.setGain(swf.shadowGain);
			} else {
				swf.setVolume(swf.shadowVolume, true);
			}
		};

		vm.getVolume = function() {
			if (!session.isBroadcasting && !swf.shadowVolume && !swf.settingUpBroadcast && !isGuest()) {
				swf.shadowVolume = swf.volume;
			}
			if (!swf.shadowGain && (session.isBroadcasting && swf.settingUpBroadcast || isGuest())) {
				swf.shadowGain = (config.mcu == "1" || isGuest()) ? (webRtc.getGain() || 0) : swf.gain;
			}
			return (session.isBroadcasting || swf.settingUpBroadcast || isGuest()) ? swf.shadowGain / 2 : swf.shadowVolume / 2;
		};

		vm.muteIcon = function() {
			if (session.isBroadcasting || swf.settingUpBroadcast || isGuest()) {
				if (config.mcu == "1" || isGuest()) {
					if (webRtc.settings.sources.gainNode) {
						return webRtc.getGain() === 0 ? 'ynicon-icon-mic-off' : 'ynicon-icon-mic'; // broadcasting or setting up
					}
				} else {
					return swf.gain === 0 ? 'ynicon-icon-mic-off' : 'ynicon-icon-mic'; // broadcasting or setting up
				}
			} else {
				return swf.volume === 0 ? 'ynicon-mute-sel' : 'ynicon-mute'; // watching
			}
		};


		vm.setMute = function() {
			if (session.isBroadcasting || isGuest()) {
				if (config.mcu == "1" || isGuest()) {
					if (swf && webRtc.getGain() !== 0) {
						swf.oldGain = webRtc.getGain() || 50;
					}
					webRtc.setGain(webRtc.getGain() === 0 ? swf.oldGain || 50 : 0); // broadcasting
					swf.shadowGain = webRtc.getGain();
				} else {
					if (swf && swf.gain !== 0) {
						swf.oldGain = swf.gain || 50;
					}
					swf.setGain(swf.gain === 0 ? swf.oldGain || 50 : 0); // broadcasting
					swf.shadowGain = swf.gain;
				}
			} else {
				if (swf && swf.volume !== 0) {
					swf.oldVolume = swf.volume || 100;
				}
				swf.setVolume(swf.volume === 0 ? swf.oldVolume || 100 : 0, true); // watching
				swf.shadowVolume = swf.volume;
			}
		};

		vm.slideVolume = function(e) {
			//firefox fix
			var isHeldDown = e.which;
			if (e.buttons !== undefined) {
				isHeldDown = e.buttons;
			} else {
				isHeldDown = e.which;
			}

			if (isHeldDown === 1) {
				if (e.offsetX > 0 || e.layerX > 0) {
					var newVolume = Number(e.offsetX || e.layerX) * 2;
					if (newVolume < 0 || newVolume === 2) {
						return false;
					}
					if (newVolume > 90) {
						newVolume = 100;
					}
					if (newVolume < 10) {
						newVolume = 0;
					}
					if (session.isBroadcasting || swf.settingUpBroadcast || isGuest()) {
						swf.shadowGain = newVolume;
					} else {
						swf.shadowVolume = newVolume;
					}
					if ((config.mcu != '1' || swf.broadcast.userId != session.user.userId) && !isGuest()) {
						if (swf.shadowGain % 5 === 0 || swf.shadowVolume % 5 === 0) {
							vm.setVolume();
						}
					} else {
						webRtc.setGain(swf.shadowGain);
					}
				}
			}
		};

		vm.openSnapshot = function(trigger) {
			$rootScope.gaEvent('Conversion', 'Share (Attempt)', trackingPixel.getUserLocation() || 'ANCILLARY');
			if (!trigger) {
				trigger = 'PROMOTE';
			}
			trackingPixel.trackClick(trigger);
			// login?
			if (!session.loggedIn) {
				session.showLoginModal('', 'SHARE').result.then(function() {
					vm.openSnapshot(trigger);
				});
				return false;
			}
			// ? broadcasting or settingup
			if (session.isBroadcasting || swf.settingUpBroadcast) {
				session.preventBroadcastInterrupt();
				return false;
			} else if (session.checkBan()) {
				return false;
			}
			shareService.trackFunnel('open');

			// open chat (in fullscreen)
			if (swf.fullscreenActive) {
				eventbus.notifySubscribers('share:snapshot');
			}

			// get snapshot
			if (isGuest() && swf.activeChatTab !== 'GuestSnapshot') {
				guestService.getSnapshot();
			} else {
				swf.getSnapshot();
			}
			vm.swf.broadcast.share_message = '';

			// share to facebook - preload permission to avoid popup on click
			if (!swf.share_facebook_permitted) {
				FB.api('/me/permissions',
					function(response) {
						if (response && !response.error) {
							for (var each in response) {
								for (var permission in response[each]) {
									if (response[each][permission].permission == 'publish_actions' && response[each][permission].status == 'granted') {
										swf.share_facebook_permitted = true;
									}
								}
							}
						}
					});
			}
		};

		// fullscreen show/hide
		vm.togglePlayerFullscreen = function() {
			if (swf.fullscreenActive) {
				hidePlayerFullscreen();
			} else {
				showPlayerFullscreen();
			}
		};

		vm.getWebrtcStats = function(open) {
			if (open) {
				if (!Api.polls.statsForNerds) {
					vm.forNerds = webRtc.retrieveStats().forNerds;
					Api.poll(function() {
						vm.forNerds = webRtc.retrieveStats().forNerds;
					}, 'statsForNerds', 5);
				}
			} else {
				vm.forNerds = null;
				$interval.cancel(Api.polls.statsForNerds);
				delete Api.polls.statsForNerds;
			}
		};

		$scope.$on('$destroy', function() {
			if (Api.polls.statsForNerds) {
				$interval.cancel(Api.polls.statsForNerds);
				delete Api.polls.statsForNerds;
			}
		});

		function isGuest() {
			return (guestService.guest && session.user && guestService.guest.userId == session.user.userId);
		}

		function showPlayerFullscreen() {
			// show
			vm.fullscreenStart = Math.floor(Date.now() / 1000);
			$rootScope.gaEvent('FULLSCREEN', 'ENTER_FULLSCREEN', config.UILocale);
			trackingPixel.capture({
				'event': 'BROADCAST_ACTION',
				'extradata': 'ENTERFULLSCREEN'
			});

			// hide
			$document.on('keyup', function(ev) {
				if (ev.which == 27) {
					hidePlayerFullscreen();
				}
			});
			// animate
			if (!swf.fullscreenActive) {
				swf.fullscreenIn = true;
				$timeout(function() {
					document.documentElement.classList.add('overflow-hidden');
					swf.fullscreenActive = true;
				}, 500);
				$timeout(function() {
					swf.fullscreenIn = false;
				}, 600);
			}
			// chat
			if (swf.activeChatTab != 'Chat') {
				eventbus.notifySubscribers('swf:reset', {
					type: 'fullscreen'
				});
			}
		}

		function hidePlayerFullscreen() {
			// hide
			vm.fullscreenEnd = Math.floor(Date.now() / 1000);
			if (vm.fullscreenStart) {
				vm.fullscreenDuration = vm.fullscreenEnd - vm.fullscreenStart;
			}
			$rootScope.gaEvent('FULLSCREEN', 'LEAVE_FULLSCREEN', config.UILocale, vm.fullscreenDuration);
			// show
			$document.off('keyup');
			// animate
			if (swf.fullscreenActive) {
				swf.fullscreenOut = true;
				$timeout(function() {
					document.documentElement.classList.remove('overflow-hidden');
					swf.fullscreenActive = false;
				}, 400);
				$timeout(function() {
					swf.fullscreenOut = false;
				}, 500);
			}
			// scroll to top left
			window.scrollTo(0, 0);
		}

	}
])

.directive('advancedOptions', function(externalStreamer, webRtc, config, $timeout, trackingPixel) {
	return {
		restrict: 'E',
		replace: true,
		templateUrl: 'angularjsapp/src/app/components/video-player/advanced-options.tpl.html',
		link: function(scope, element, attr, ctrl) {
			scope.externalStreaming = externalStreamer.settings;
			scope.toggleExternalStreaming = function() {
				if (config.mcu) {
					if (!externalStreamer.settings.active) {
						webRtc.destroy();
					} else {
						//reinit the webrtc, but do not override the last saved ice callback
						$timeout(function() {
							webRtc.initialize();
						});
					}
				}
				externalStreamer.settings.active = !externalStreamer.settings.active;
				trackingPixel.trackClick('EXTERNAL_TOOL', {
					field1: (externalStreamer.settings.active ? 'ON' : 'OFF')
				});
			};
		}
	};
})

.directive('bitrateLine', function($interval) {
	return {
		restrict: 'E',
		replace: true,
		template: '<canvas></canvas>',
		scope: {
			bps: '='
		},
		link: function(scope, element, attr) {
			var canvas = element[0],
				canvasBuffer = document.createElement("canvas"),
				context = canvas.getContext("2d"),
				ctxBuffer,
				yAxis = 0,
				xAxis = 0;

			canvasBuffer.width = canvasBuffer.height = canvas.width;
			ctxBuffer = canvasBuffer.getContext("2d");

			canvas.height = 75;
			canvas.width = 300;

			context.beginPath();
			context.moveTo(0, 50);
			context.strokeStyle = '#61c13e';
			context.stroke();

			var lineDrawingInterval = $interval(function() {
				if (scope.bps) {
					if (scope.bps < 2000) {
						yAxis = Math.log(scope.bps) * 9;
					} else {
						yAxis = 70;
					}

					xAxis++;
					//only chop when maxed out
					if (xAxis >= canvas.width) {
						ctxBuffer.clearRect(0, 0, canvasBuffer.width, canvasBuffer.height); //clear buffer
						ctxBuffer.drawImage(canvas, 0, 0); //store display data in buffer
						context.clearRect(0, 0, canvas.width, canvas.height); //clear display
						context.beginPath(); //clear the path's history so it doesn't redraw old stuff
						context.drawImage(canvasBuffer, -1, 0); //copy buffer to display
						xAxis = 297;
					}

					context.lineTo(xAxis, 75 - yAxis);
					context.stroke();
				}
			}, 1000);

			scope.$on('$destroy', function() {
				$interval.cancel(lineDrawingInterval);
			});
		}
	};
})

.directive('playerFooter', ['eventbus', '$interval', 'swf', '$filter', 'Api', '$document', "$timeout",
	function(eventbus, $interval, swf, $filter, Api, $document, $timeout) {
		return {
			restrict: 'A',
			templateUrl: 'angularjsapp/src/app/components/video-player/player-footer.tpl.html',
			controller: 'PlayerFooterCtrl',
			controllerAs: 'vm',
			link: function(scope, element, attr, controller) {
				var vm = controller;
				scope.playerFooter = {};

				// Increment view time every second
				var broadcastTimer = $interval(function() {
					if (swf.broadcast && swf.broadcast.length && !swf.eob) {
						swf.broadcast.length++;
						niceLength();
						if (navigator.onLine === false) {
							swf.userOffline = true;
						}
						if (navigator.onLine && swf.userOffline && swf.broadcast && swf.broadcast.userId) {
							Api.get('broadcast/info', {
									channelId: swf.broadcast.userId,
									curId: swf.broadcast.userId
								})
								.then(function(response) {
									if (!response.data.errorCode) {
										swf.newBroadcaster(swf.broadcast);
									} else {
										window.YouNow.App.loadChannel();
									}
								});

							swf.userOffline = false;
						}
					}
				}, 1000);

				function niceLength(event, data) {
					if (data && data.type == 'fullscreen') {
						if (data.state == 'close') {
							vm.togglePlayerFullscreen();
						}
						return false;
					}
					if (swf.broadcast && swf.broadcast.length === 0) {
						swf.broadcast.length = 1;
					}
					if (swf.broadcast && swf.broadcast.length !== undefined && swf.broadcast.length !== null) {
						scope.playerFooter.niceLength = $filter('date')(swf.broadcast.length * 1000, 'mm:ss');
						if (swf.broadcast.length >= 3600) {
							scope.playerFooter.niceLength = Math.floor(swf.broadcast.length / 3600) + ":" + scope.playerFooter.niceLength;
						}
					}
				}

				//display muted message if the volume was muted upon load but only after rendering the template
				$timeout(function() {
					var swfBeforeVol = Number(Api.store('younowVol'));
					if (swfBeforeVol === 0 && document.getElementById('volume-icon')) {
						Api.triggerTooltip('volume-icon', 4000);
					}
				});

				//subscribe
				eventbus.subscribe('swf:reset', niceLength, 'playerfooter', scope);

				//clean up
				scope.$on('$destroy', function() {
					$interval.cancel(broadcastTimer);
					$document.off('keyup');
				});
			}
		};
	}
])

;
