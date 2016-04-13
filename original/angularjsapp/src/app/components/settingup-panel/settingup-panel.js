angular.module('younow.channel.settingupPanel', [])

.directive('settingupPanel', ['Api', 'config', 'swf', 'session', '$rootScope', 'broadcasterService', 'eventbus', '$timeout', 'webRtc', 'externalStreamer', 'trackingPixel', function(Api, config, swf, session, $rootScope, broadcasterService, eventbus, $timeout, webRtc, externalStreamer, trackingPixel) {
	return {
		restrict: 'A',
		templateUrl: 'angularjsapp/src/app/components/settingup-panel/settingup-panel.tpl.html',
		link: function(scope, element, attrs) {
			scope.panel = {
				typeaheadClosed: true,
				popularTags: undefined,
				networks: {
					twitter: session.user.twitterAuthPublish ? true : false,
					tumblr: session.user.tumblrAuthPublish ? true : false,
					facebook: session.user.facebookAuthPublish ? true : false,
					youtube: session.user.youTubeAuthPublish ? true : false,
					facebookShare: false
				},
				showYoutube: session.user.level >= 5 || session.user.youTubeAuthPublish ? true : false,
				startingBroadcast: false,
				externalStreaming: externalStreamer.settings
			};

			var typeaheadInput = document.getElementById('typeaheadInput'),
				shareInput = document.getElementById('share-input'),
				startBroadcastBtn = document.getElementById('start-broadcast-btn'),
				pcConfig;

			function shareBroadcast(network, broadcastId) {
				swf.getShareData(network, broadcastId, false, true).then(function(data) {
					data.callback = function(post_id) {
						if (post_id) {
							scope.panel.networks.facebookShare = true;
						}
					};
					Api.openSharePopup(data);
				});
			}

			function uploadBroadcastThumb() {
				if (externalStreamer.settings.active || externalStreamer.settings.streaming) {
					return false;
				} else if (!scope.panel.snapshot && config.mcu != "1") {
					swf.invokeSwfMethod('getSnapshot', true);
				} else if (config.mcu == "1") {
					if (!scope.panel.snapshot) {
						scope.panel.takeSnapshot();
					}
					Api.post('broadcast/uploadThumb', {
						userId: session.user.userId,
						channelId: session.user.userId,
						image: scope.panel.snapshot
					});
				} else {
					window.YouNow.App.sendSnapshot(scope.panel.snapshot, true);
				}
			}

			function switchToLive(response, externalStream) {
				if (config.mcu && !externalStreamer.settings.active) {
					webRtc.pc.setRemoteDescription(new pcConfig.SessionDescription({
						"sdp": response.data.sdpAnswer,
						"type": "answer"
					}), webRtc.setRemoteDescriptionSuccess, webRtc.setRemoteDescriptionFail);
					webRtc.settings.state = 'connected';
					if(scope.panel.networks.tumblr) {
						//Api.preloadAdvection(response.data.media.prefix,response.data.id);
					}
				} else if (externalStream) {
					webRtc.destroy();
				} else {
					swf.invokeSwfMethod('startBroadcast', response.data);
				}
				if (!externalStream) {
					session.isBroadcasting = true;
				}
				uploadBroadcastThumb();
				broadcasterService.switchBroadcaster(session.user.userId, undefined, undefined, response.data);
				//remove eob screen if there is one
				if (swf.eob) {
					delete swf.eob;
				}
			}

			function getSelectedTag() {
				var tag;
				var tagSelected = scope.panel.tagSelected ? scope.panel.tagSelected : false;
				if ((!tagSelected || tagSelected.length === 0)) {
					if (!Api.store('lastBroadcastedTag')) {
						tag = session.user.fullName.replace(' ', '');
						Api.store('lastBroadcastedTag', tag);
					}
					if (Api.store('lastBroadcastedTag')) {
						tag = Api.store('lastBroadcastedTag');
					}
				} else {
					tag = scope.panel.tagSelected;
					Api.store('lastBroadcastedTag', tag);
				}
				return tag;
			}

			scope.panel.getTags = function() {
				Api.get('younow/popularTags', {
						locale: config.UILocale
					})
					.then(function(response) {
						if (response.data && response.data.errorCode === 0) {
							for (var tag in response.data.popular_tags) {
								response.data.popular_tags[tag].tag = '#' + response.data.popular_tags[tag].tag;
							}
							response.data.popular_tags.unshift({
								'tag': false
							});
							scope.panel.matches = response.data.popular_tags;
							scope.panel.popularTags = response.data.popular_tags;
						}
					});
			};

			scope.panel.loadTags = function(value) {
				scope.panel.typeaheadClosed = false;
				if (value.indexOf('#') !== -1) {
					value = value.replace('#', '');
				}
				return Api.get('younow/tags', {
						locale: config.UILocale,
						s: value
					})
					.then(function(response) {
						if (response && response.data && response.data.tags) {
							for (var tag in response.data.tags) {
								if (session.user.editorsPick && response.data.tags[tag].tag === session.user.editorsPick.tag) {
									response.data.tags[tag].isEp = true;
								}
								if (response.data.tags[tag].tag === value) {
									response.data.tags.splice(tag, 1);
								} else {
									if (response.data.tags[tag].tag.indexOf('#') === -1) {
										response.data.tags[tag].tag = '#' + response.data.tags[tag].tag;
									}
								}
							}
							response.data.tags = [{
								'tag': '#' + value
							}].concat(response.data.tags);
							scope.panel.matches = response.data.tags.concat(angular.copy(scope.panel.popularTags));
						} else {
							scope.panel.matches = [{
								'tag': '#' + value
							}].concat(angular.copy(scope.panel.popularTags));
						}
						return scope.panel.matches;
					});
			};

			scope.panel.validateTag = function(tag) {
				if (!tag) {
					tag = '';
				}
				if (tag.length === 0) {
					scope.panel.tagSelected = '';
					scope.panel.typeaheadClosed = true;
				}
				if (scope.panel.tagSelected === 'false') {
					scope.panel.tagSelected = '';
				}
				if (/[#\ ]/.test(tag)) {
					tag = tag.replace(/[#]/g, '');
					tag = tag.replace(/[\ ]/g, '-');
				}
				//Checks if ending with - or _, Alpha numeric or contains ()-_
				if (tag.slice(1, tag.length).match(/^((?!\-$|_$)[a-zA-Z1-9\-_()])+$/g) && tag.length > 1) {
					scope.panel.tagValid = true;
				} else {
					scope.panel.tagValid = false;
				}
				scope.panel.tagSelected = tag;
			};

			scope.panel.selectTag = function(tag, model, label) {
				if (tag && !tag.tag) {
					tag.tag = '';
				}

				scope.panel.typeaheadClosed = true;
				scope.panel.tagSelected = tag.tag.replace('#', '');
				shareInput.focus();
			};

			scope.panel.takeSnapshot = function() {
				if (config.mcu == "1") {
					scope.panel.snapshot = webRtc.takeSnapshot(undefined, undefined, undefined, true);
				} else {
					swf.invokeSwfMethod('getSnapshot', false);
				}
			};

			scope.panel.toggleShare = function(network) {
				if ((network == 'twitter' && !session.user.twitterHandle) || (network == 'tumblr' && !session.user.tumblrId) || (network == 'facebook' && !session.user.facebookId) || (network == 'youtube' && !session.user.youTubeAuth)) {
					$rootScope.gaEvent('CONNECT', 'ATTEMPT_' + network.toUpperCase(), 'GOLIVE');
					//get auth and connect
					session.authenticate[network]().then(function(data) {
						session.login(data, true).then(function(data) {
							if (data.data.errorCode > 0 || data.config.data.indexOf('lastName=&') > -1) {
								$rootScope.gaEvent('CONNECT', 'ERROR_' + network.toUpperCase(), 'GOLIVE');
							} else {
								if (network == 'facebook' && session.user.facebookPageId.length === 0) {
									shareBroadcast(network, scope.panel.initResponse.id);
									return false;
								}
								if (network == 'youtube') {
									scope.panel.checkYoutube();
								} else {
									scope.panel.networks[network] = scope.panel.networks[network] ? false : true;
								}
								$rootScope.gaEvent('CONNECT', 'CONNECT_' + network.toUpperCase(), 'GOLIVE');
							}
						});
					});
				} else if (network == 'facebook' && session.user.facebookId && session.user.facebookPageId.length === 0) {
					shareBroadcast(network, scope.panel.initResponse.id);
				} else if (network == 'youtube' && !session.user.youTubeAuthPublish) {
					scope.panel.checkYoutube();
				} else {
					scope.panel.networks[network] = !scope.panel.networks[network];
				}
			};

			scope.panel.checkYoutube = function() {
				scope.panel.networks.youtube = !scope.panel.networks.youtube;
				Api.get('channel/youtubeLiveEnabled', {
					userId: session.user.userId
				}).success(function(data) {
					if (data.errorCode !== 0) {
						scope.panel.networks.youtube = !scope.panel.networks.youtube;
						Api.showTopNotification('Live streaming is not enabled on your Youtube account: <a target="_blank" href="https://www.youtube.com/live_streaming_signup">https://www.youtube.com/live_streaming_signup</a>', 'danger', false, false, 5000);
					}
				});
			};

			scope.panel.startBroadcast = function() {
				scope.panel.startingBroadcast = true;
				if (config.mcu && !webRtc.getCurrentConfig().streamReady) {
					webRtc.setupWebrtcStream();
					webRtc.settings.state = 'connecting';
					return false;
				}
				var tag = getSelectedTag(),
					broadcastPromise;

				broadcasterService.addBroadcast(scope.panel.initResponse.id, tag, scope.panel.networks, scope.panel.shareCopy, webRtc.pc)
					.then(function(response) {
						if (response.data.errorCode === 0) {
							switchToLive(response);
						}
						if (response.data.errorCode > 0) {
							//if it's a timed out setup, let's reinit and try again.
							if (response.data.errorCode === 249) {
								broadcasterService.initBroadcast().then(function(response) {
									broadcasterService.addBroadcast(response.data.id, tag, scope.panel.networks, scope.panel.shareCopy, webRtc.pc)
										.then(function(response) {
											if (response.data.errorCode === 0) {
												switchToLive(response);
											}
										});
								});
							} else {
								scope.panel.startingBroadcast = false;
								webRtc.settings.state = 'ready';
							}
						}
					});
			};

			scope.panel.prepareBroadcast = function() {
				scope.panel.startingBroadcast = true;
				var tag = getSelectedTag();
				broadcasterService.addBroadcast(scope.panel.initResponse.id, tag, scope.panel.networks, scope.panel.shareCopy)
					.then(function(response) {
						//switch to playback
						if (response.data.errorCode === 0) {
							externalStreamer.setBroadcastAddResp(response.data);
							switchToLive(response, true);
						}
						scope.panel.startingBroadcast = false;
					});
				trackingPixel.trackClick('EXTERNAL_TOOL', {
					field1: 'GENERATE'
				});
			};

			window.YouNow.App.cameraReady = function() {
				if (!scope.panel.initResponse) {
					// swf.invokeSwfMethod('mirror', Api.store('mirrorCamera'));
					broadcasterService.initBroadcast().then(function(response) {
						externalStreamer.setBroadcastInitResp(response.data);
						if (response && response.data.errorCode === 0) {
							scope.panel.initResponse = response.data;
						}
						//reconnect
						if (response && response.data.errorCode === 603) {
							switchToLive(response);
						}
						//webrtc reconnect
						if (response && response.data.errorCode === 606) {
							broadcasterService.reconnect().then(function(data) {
								switchToLive(response);
							});
						}
					});
				}
			};

			//setup tab focus for when typeahead is open
			angular.element(typeaheadInput).on('keyup', function(event) {
				if (event.which == 9) {
					shareInput.focus();
				}
			});

			//initialize the panel
			scope.panel.getTags();
			typeaheadInput.focus();

			$timeout(function() {
				swf.invokeSwfMethod('goLive', {
					skipChannelSelection: false
				});
			});

			eventbus.subscribe('pusher:ban', function(event, message) {
				if (message.message) {
					swf.settingUpBroadcast = false;
				}
			}, 'settingupPanel', scope);

			eventbus.subscribe('swf:snapshot', function(event, image) {
				if (image) {
					scope.panel.snapshot = image;
				}
			}, 'settingupPanel', scope);

			//cleanup phase
			scope.$on('$destroy', function() {
				window.YouNow.App.cameraReady = null;
			});

			/**************************************** WebRTC *************************************/
			function onIceCandidate(event) {
				if (event.candidate) {
					// console.log("Sending Ice Candidate:\n" + JSON.stringify({
					// 	"id": "broadcaster",
					// 	"candidate": event.candidate
					// }));
				} else {
					pcConfig = webRtc.getCurrentConfig();
					webRtc.setStatus("End of candidates, sending sdp to server.");
					pcConfig.streamReady = true;
					scope.panel.startBroadcast();
				}
			}
			if (config.mcu) {
				webRtc.initialize(onIceCandidate)
					.then(function(response) {
						window.YouNow.App.cameraReady();
					});
			}
		}
	};
}]);
