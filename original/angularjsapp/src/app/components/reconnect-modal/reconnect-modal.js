angular.module('younow.modals.reconnect-modal', [])

.controller('ReconnectModalCtrl', function($rootScope, $scope, $modalInstance, $timeout, $state, session, webRtc, broadcasterService, swf, guestService, externalStreamer, config) {
	var vm = this,
		bcVideoWatcher;
	vm.retryTime = 0;

	vm.viewers = session.user.activeBroadcastReconnect.viewers;

	vm.noReconnect = function() {
		broadcasterService.dropBroadcast(session.user.userId);
		$modalInstance.close();
	};

	vm.reconnect = function() {
		vm.retryTime = 1;
		session.isBroadcasting = true;
		swf.bootingFlash = false;
		$state.go('main.channel.detail', {
			profileUrlString: session.user.profile
		});

		bcVideoWatcher = $scope.$watch(
			function() {
				return document.getElementById('bcVideo');
			},
			function(newValue, oldValue) {
				if (newValue !== null) {
					bcVideoWatcher();
					webRtc.initialize(function(event) {
						if (event.candidate) {
							console.log("Sending Ice Candidate:\n" + JSON.stringify({
								"id": "broadcaster",
								"candidate": event.candidate
							}));
						} else {
							var pcConfig = webRtc.getCurrentConfig();
							webRtc.setStatus("End of candidates, sending sdp to server.");
							pcConfig.streamReady = true;
							reconnect(pcConfig);
						}
					}).then(function() {
						webRtc.setupWebrtcStream();
					});
				}
			}
		);
	};

	vm.endBroadcast = function() {
		$modalInstance.close();
		broadcasterService.dropBroadcast(session.user.userId);
	};

	vm.closeModal = function() {
		$modalInstance.dismiss();
	};

	function dropBroadcast() {
		$modalInstance.close();
		broadcasterService.dropBroadcast(session.user.userId);
		webRtc.destroy();
	}

	function reconnect(pcConfig) {
		vm.retryTime++;
		broadcasterService.reconnect(webRtc.pc).then(function(response) {
			if (response.data.sdpAnswer) {
				webRtc.pc.setRemoteDescription(new pcConfig.SessionDescription({
					"sdp": response.data.sdpAnswer,
					"type": "answer"
				}), webRtc.setRemoteDescriptionSuccess, webRtc.setRemoteDescriptionFail);
			}
			if (vm.retryTime <= 10) {
				if (!response.data.sdpAnswer || response.errorCode == 917) {
					reconnect(pcConfig);
				} else if (response.data.sdpAnswer) {
					$modalInstance.close();
				} else {
					dropBroadcast();
				}
			} else {
				dropBroadcast();
			}
		});
	}

	$scope.$on('$destroy', function() {
		if (bcVideoWatcher) {
			bcVideoWatcher();
		}
	});
})

;
