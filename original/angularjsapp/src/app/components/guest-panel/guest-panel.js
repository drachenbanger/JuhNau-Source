angular.module('younow.channel.guest-panel', [])

.controller('GuestPanelCtrl', function($scope, webRtc, swf, $interval, session, $timeout, Api, config, guestService, $modal, eventbus, trackingPixel, $filter) {
	var vm = this;
	var previewInterval,
		lastGuestRefresh,
		_guestList,
		guestListViewableCount = 5;

	vm.animate = false;
	vm.state = 'guestList';
	vm.swf = swf;
	vm.session = session;
	vm.config = config;
	vm.guestService = guestService;
	vm.cameraReady = false;
	vm.translatedText = {
		guest_make: $filter('translate')('guest_make')
	};
	vm.guestListFilter = 'sorting_level';
	vm.guestListFilterLabels = { // these keys correspond to value of vm.guestListfilter AND keys in .json translations
		'sorting_level': 'Level',
		'sorting_waitingtime_asc': 'Waiting Longest',
		'sorting_waitingtime_desc': 'Just Joined',
		'sorting_alphabetical': 'Alphabetical'
	};

	vm.openGuestOptIn = function() {
		if (!window.getUserMedia || Api.isMEdge()) {
			$modal.alert("Sorry, you're browser doesn't support YouNow broadcasting. Please upgrade to the latest version of <a href='https://www.mozilla.org/en-US/firefox/new/' target='_blank'>FireFox</a> or <a href='https://www.google.com/chrome/browser/desktop/' target='_blank'>Chrome</a>.");
			trackingPixel.capture({
				'event': 'CLICK',
				'extradata': 'GUESTBROADCASTING',
				'field1': 'GUEST_BECOME',
				'field2': 'UNSUPPORTED'
			});
			return false;
		}
		if (guestService.userGuestObj) {
			return false;
		}
		if (session.user.userId === 0) {
			session.showLoginModal(false, 'GUEST_BECOME')
				.result.then(function(response) {
					if (response.data && response.data.id !== 0) {
						vm.state = 'guestPreview';
						trackingPixel.capture({
							'event': 'CLICK',
							'extradata': 'GUESTBROADCASTING',
							'field1': 'GUEST_BECOME',
							'field2': 'CONFIRM'
						});
						webRtc.loadPreview('preview-video').then(
							//success
							function(stream) {
								vm.previewStream = stream;
							},
							//fail
							function() {
								vm.state = 'guestList';
							}
						);
					}
				});
			return false;
		}
		trackingPixel.capture({
			'event': 'CLICK',
			'extradata': 'GUESTBROADCASTING',
			'field1': 'GUEST_BECOME',
			'field2': 'CONFIRM'
		});
		vm.state = 'guestPreview';
		webRtc.loadPreview('preview-video').then(
			//success
			function(stream) {
				vm.previewStream = stream;
			},
			//fail
			function() {
				vm.state = 'guestList';
			}
		);
	};

	vm.closeGuestOptIn = function() {
		vm.state = 'guestList';
		vm.imageTaken = undefined;
		vm.previewImage = undefined;
		vm.counter = undefined;
		if (previewInterval) {
			$interval.cancel(previewInterval);
		}
		trackingPixel.capture({
			'event': 'CLICK',
			'extradata': 'GUESTBROADCASTING',
			'field1': 'GUEST_GIF_CANCEL'
		});
	};

	vm.previewCountdown = function(event) {
		if (!vm.previewStream) {
			$modal.alert("You must allow camera access to guest broadcast. You can edit this in your browser settings.");
			vm.state = 'guestList';
			return false;
		}
		if (!vm.imageTaken) {
			trackingPixel.capture({
				'event': 'CLICK',
				'extradata': 'GUESTBROADCASTING',
				'field1': 'GUEST_MAKE_PREVIEW'
			});
		} else {
			trackingPixel.capture({
				'event': 'CLICK',
				'extradata': 'GUESTBROADCASTING',
				'field1': 'GUEST_REDO_PREVIEW'
			});
		}
		vm.counter = 3;
		vm.previewImage = undefined;
		previewInterval = $interval(function() {
			if (vm.counter !== 0) {
				vm.counter--;
			}
			if (vm.counter === 0) {
				$interval.cancel(previewInterval);
				vm.previewImage = webRtc.takeSnapshot(document.getElementById('preview-video'), 320, 240);
				if (!vm.imageTaken) {
					vm.imageTaken = true;
				}
			}
		}, 1000);
	};

	vm.optIn = function() {
		trackingPixel.capture({
			'event': 'CLICK',
			'extradata': 'GUESTBROADCASTING',
			'field1': 'GUEST_GIF_SUBMIT'
		});
		Api.post('guest/optin', {
			channelId: swf.broadcast.userId,
			userId: session.user.userId,
			snapshot: vm.previewImage
		}).then(function(response) {
			if (response.data.errorCode === 0 && response.data.guestInfo) {
				vm.state = 'guestList';
				$timeout(function() {
					webRtc.destroy(vm.previewStream, undefined, 'preview');
					guestService.newUserGuestObj(response.data.guestInfo);
					getGuestList(true);
				}, 1000);

				$timeout(function() {
					vm.previewImage = undefined;
					vm.imageTaken = false;
				}, 3000);
			}
			if (response.data.errorCode > 0 || !response.data.guestInfo) {
				vm.state = 'guestList';
				$timeout(function() {
					webRtc.destroy(vm.previewStream, undefined, 'preview');
				}, 1000);

				$timeout(function() {
					vm.previewImage = undefined;
					vm.imageTaken = false;
				}, 3000);
			}
		});
	};

	vm.optOut = function() {
		Api.post('guest/optout', {
			channelId: swf.broadcast.userId,
			userId: session.user.userId,
		}).then(function(response) {
			if (response.data.errorCode === 0) {
				guestService.updateUserGuestObj();
				getGuestList(true);
			}
			if (response.data.errorCode > 0) {
				Api.showTopNotification(response.data.errorMsg);
			}
		});
		trackingPixel.capture({
			'event': 'CLICK',
			'extradata': 'GUESTBROADCASTING',
			'field1': 'GUEST_REMOVE_ME'
		});
	};

	vm.inviteGuest = function(guest) {
		if (guestService.pendingGuest) {
			return false;
		}

		if (guestService.guest) {
			guestService.overlayStates.guest = 'swapping';
			guestService.pendingGuest = {
				guest: guest
			};
		} else {
			guestService.inviteGuest(session.user.userId, guest.userId, guest);
		}
	};

	vm.openProfile = function(userId, index) {
		$modal.profileSummary(userId, {
			source: 'GUESTLIST'
		});
		if (index) {
			if (session.user.userId == swf.broadcast.userId) {
				trackingPixel.capture({
					'event': 'CLICK',
					'extradata': 'GUESTBROADCASTING',
					'field1': 'BROADCASTER_GUEST_GIF',
					'sourceid': index + 1
				});
			} else {
				trackingPixel.capture({
					'event': 'CLICK',
					'extradata': 'GUESTBROADCASTING',
					'field1': 'GUEST_GIF',
					'sourceid': index + 1
				});
			}
		}
	};

	vm.cameraValid = function() {
		var cameraExists = webRtc.checkIfCameraExists(vm.previewStream);
		if (cameraExists) {
			vm.cameraReady = true;
		}
	};

	eventbus.subscribe('session:loggedIn', function(event, loggedIn) {
		if (!loggedIn) {
			vm.state = 'guestList';
		}
	}, 'guestpanel', $scope);

	vm.loadGuestList = function(increment) {
		//check if list exists
		if (_guestList) {
			if (increment && _guestList.length > guestListViewableCount) {
				guestListViewableCount += 5;
			}
			vm.guestList = $filter('limitTo')(_guestList, guestListViewableCount);
		}
	};

	vm.sortGuestList = function(filter, dir) {
		if (filter) {
			//reset the direction every time we filter because only certain lists use the non-default directional sorting
			guestService.listPreferences.dir = undefined;
			if (dir === undefined) {
				dir = '';
			} else {
				guestService.listPreferences.dir = dir == 'desc' ? 0 : 1;
				dir = '_' + dir;
			}
			guestService.listPreferences.filter = filter;
			vm.guestListFilter = 'sorting_' + filter + dir; // this value is the key in vm.guestListFilterLabels, ALSO key in .json translations
			guestListViewableCount = 5;
			getGuestList(true);
		}
	};

	//fetch on a loop, or instant call
	function getGuestList(instant) {
		var isCdn = true,
			params = {
				channelId: swf.broadcast.userId,
				sort: guestService.listPreferences.filter
			};

		if (instant && Api.polls.guestList) {
			$interval.cancel(Api.polls.guestList);
			delete Api.polls.guestList;
		}

		if (guestService.listPreferences.dir !== undefined) {
			params.dir = guestService.listPreferences.dir;
		}

		isCdn = swf.broadcast.userId == session.user.userId ? false : true;
		Api.get('guest/list', params, isCdn).then(function(response) {
			response.data.nextRefresh = response.data.nextRefresh ? response.data.nextRefresh : 30;
			if (response.data.list) {
				formatGuestList(response.data.list);
				if (lastGuestRefresh != response.data.nextRefresh && Api.polls.guestList !== undefined) {
					$interval.cancel(Api.polls.guestList);
					delete Api.polls.guestList;
				}
			}
			if (response.data.errorCode > 0) {
				Api.showTopNotification(response.data.errorMsg);
			}
			if (!Api.polls.guestList) {
				Api.poll(getGuestList, 'guestList', response.data.nextRefresh);
				lastGuestRefresh = response.data.nextRefresh;
			}
		});
	}

	function formatGuestList(guests) {
		for (var i = 0; i < guests.length; i++) {
			if (guests[i].location) {
				guests[i].formattedLocation = Api.cleanLocation(guests[i].location);
			} else {
				guests[i].formattedLocation = '';
			}
		}
		//reset the list for performance reasons
		_guestList = null;
		_guestList = guests;
		vm.loadGuestList();
	}

	//initialize the panel
	getGuestList();

	//controller clean up phase
	$scope.$on('$destroy', function() {
		if (previewInterval) {
			$interval.cancel(previewInterval);
		}
		if (Api.polls.guestList) {
			//null out the guest list just in case
			vm.guestList = null;
			$interval.cancel(Api.polls.guestList);
			delete Api.polls.guestList;
		}

	});

})

.value('GuestListComponent', window.YouNow.ReactComponents.GuestListComponent)

.directive('guestList', function(reactDirective) {
	return reactDirective('GuestListComponent');
})

.directive('guestPanel', function(webRtc) {
	return {
		restrict: 'A',
		templateUrl: 'angularjsapp/src/app/components/guest-panel/guest-panel.tpl.html',
		controller: 'GuestPanelCtrl',
		controllerAs: 'vm',
		scope: {},
		link: function(scope, element, attrs, controller) {
			element.on('$destroy', function() {
				if (controller.previewStream) {
					webRtc.destroy(controller.previewStream, undefined, 'preview');
				}
			});
		}
	};
})

;
