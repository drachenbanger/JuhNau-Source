angular.module('younow.channel.selfie-view', [])

/*
	Please keep in mind that this selfieView directive has an open scope and often uses the parent's scope (as of the time of writing this
	the parent scope was the chat component)
*/
.directive('selfieView', function(webRtc, $interval, $timeout, config, selfies, swf, session, trpx) {
	return {
		restrict: 'E',
		templateUrl: 'angularjsapp/src/app/components/chat/selfie-view.tpl.html',
		link: function(scope, element, attrs) {
			var vm = scope.$parent.vm,
				stream,
				video,
				frames = {
					preview: [],
					sf: [],
					sfb: [],
					framesProcessed: []
				};

			scope.animationProgress = '';
			scope.selfies = selfies;

			if (vm.creatingSelfie) {
				video = element[0].getElementsByTagName('video')[0];
				selfies.localSelfieSrc.preview = "//:0";
				webRtc.loadPreview('preview-selfie').then(function(response) {
					stream = response;
				});
			}

			//wait until the next digest to set the scope to opening
			$timeout(function() {
				scope.opening = true;
				angular.element(document).on('click', vm.closeSelfieView);
			}, 0);

			vm.closeSelfieView = function(e) {
				if (e && e.target) {
					if (e.target.tagName === 'BUTTON' || e.target.parentNode.tagName === 'SPAN') {
						return false;
					}
				}
				if (vm.creatingSelfie && !scope.closing) {
					if (frames.preview.length === 4) {
						trpx.capture({
							event: 'SELFIE_CMPLT',
							extradata: frames.preview.length
						}, trpx.captureGroups.trackevents);
					} else {
						trpx.capture({
							event: 'SELFIE_INCMPLT',
							extradata: frames.preview.length
						}, trpx.captureGroups.trackevents);
					}
					scope.closing = true;
					$timeout(function() { //wait until after the exit animation to remove the animate class and kill camera
						vm.creatingSelfie = undefined;
						webRtc.destroy(stream, video, 'preview');
						angular.element(element[0].getElementsByClassName('selfie-creation')).removeClass('animate');
					}, 1000);
				} else {
					scope.closing = true;
					$timeout(function() {
						vm.selectedSelfie = undefined;
					}, 1000);
				}
				vm.closeSelfieView = undefined;
				vm.cameraValid = undefined;
			};

			vm.cameraValid = function() {
				angular.element(element[0].getElementsByClassName('selfie-creation')).addClass('animate');
				video.style.visibility = 'visible';

				function takeFrame() {
					$timeout(function() {
						if (frames.preview.length < 4) {
							var animateCount = frames.preview.length !== undefined ? 0 : Number(frames.preview.length);
							scope.animationProgress += ' animate-' + (frames.preview.length + 1) + ' ';
							scope.flickerMode = true;
							var frame_preview = 'data:image/jpeg;base64,' + webRtc.takeSnapshot(video, 400, 400);
							var frame_sf = 'data:image/jpeg;base64,' + webRtc.takeSnapshot(video, 322, 276);
							var frame_sfb = 'data:image/jpeg;base64,' + webRtc.takeSnapshot(video, 150, 150);
							frames.preview.push(frame_preview);
							frames.sf.push(frame_sf);
							frames.sfb.push(frame_sfb);
							if (frames.preview.length === 4) {
								generateGif(frames.preview, 400, 400, 'sfb');
								generateGif(frames.sf, 322, 276, 'preview');
								generateGif(frames.sfb, 150, 150, 'sf');
							}
						} else {
							if (selfieCreationInterval) {
								$interval.cancel(selfieCreationInterval);
							}
						}
					}, 500);
				}
				var selfieCreationInterval = $interval(function() {
					scope.flickerMode = false;
					if (frames.preview.length >= 4) {
						$interval.cancel(selfieCreationInterval);
						takeFrame();
					} else {
						takeFrame();
					}
				}, 700);
			};

			scope.$on('$destroy', function() {
				if (vm.creatingSelfie) {
					vm.creatingSelfie = undefined;
					vm.closeSelfieView = undefined;
					vm.cameraValid = undefined;
					webRtc.destroy(stream, video, 'preview');
				}
				angular.element(document).off('click');
			});

			function generateGif(images, width, height, type) {
				if (!scope.closing) {
					window.SuperGif.encoder.createGIF({
						images: images,
						interval: config.settings.SelfieFramerate / 1000,
						gifWidth: width,
						gifHeight: height
					}, function(obj) {
						if (!obj.error) {
							selfies.localSelfieSrc[type] = obj.image;
							frames.framesProcessed.push(type);
							if (frames.framesProcessed.length === 3) {
								selfies.uploadSelfie(swf.broadcast.userId, session.user.requestBy);
							}
						}
					});
				}
			}
		}
	};
});
