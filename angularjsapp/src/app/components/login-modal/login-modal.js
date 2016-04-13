angular.module('younow.modals.login', [])

.controller('LoginModalCtrl', function($scope, $rootScope, $timeout, $interval, $modalInstance, session, Api, config, $state, broadcasterService, soft, source, trackingPixel, data) {

	$scope.base = config.settings.ServerCDNBaseUrl;
	$scope.soft = soft;
	$scope.loggingIn = {};
	
	// title
	$scope.data = data || {};
	if (!$scope.data.title) {
		$scope.data.title = 'loginmodal_title';
	}
	
	if (!source) {
		source = $state.$current.name;
	}
	$timeout(function() {
		if (source === 'LINK') {
			if ($state.is('main.channel.detail')) {
				source = broadcasterService.async ? 'LINK_PROFILE' : 'LINK_LIVE';
			} else {
				source = "LINK_OTHER";
			}
		}
		$rootScope.gaEvent('LOGIN', 'PROMPT', source);
	}, 500);

	$scope.showMoreOptions = function() {
		$scope.moreOptions = true;
	};

	$scope.cancel = function() {
		$modalInstance.dismiss('Modal closed without authenticating');
	};

	$scope.login = function(type) {
		if (!$scope.attemptedLogin) {
			$scope.attemptedLogin = true;
		}
		$scope.loggingIn[type] = true;
		checkPopup(type);

		$rootScope.gaEvent('LOGIN', 'ATTEMPT_' + type.toUpperCase(), source);
		trackingPixel.trackClick('LOGIN', {
			field1: type.toUpperCase(),
			field2: source.toUpperCase()
		});

		if (session.authenticate[type]) {
			$timeout(function() {
				session.auth(type)

				// modal used
				.then(function(response) {
					// Success
					if (response && response.data && response.data.id) {
						// log
						if (response.data.newUser) {
							$rootScope.gaEvent('LOGIN', 'LOGIN_NEW_' + type.toUpperCase() + '', source);
						} else {
							$rootScope.gaEvent('LOGIN', 'LOGIN_RETURNING_' + type.toUpperCase() + '', source);
						}
						//  Close after slight delay, to give time to fetch fan status and update UI
						$timeout(function() {
							$modalInstance.close(response);
						}, 300);
						if (response.data.coinFeedbackCopy && response.data.coinFeedbackAmount) {
							Api.showTopNotification(response.data.coinFeedbackCopy + ' <img class="coin-sm" src="' + config.settings.ServerCDNBaseUrl + '/angularjsapp/src/assets/images/icons_v3/menu_user_coins1.png">' + response.data.coinFeedbackAmount, 'now', false, undefined, 5000);
						}
					}
					// Reject if response was empty
					else {
						rejectLogin('Unsuccessful');
					}
					$scope.loggingIn[type] = false;
				})

				// modal closed
				.catch(function() {
					$scope.loggingIn[type] = false;
					rejectLogin('Failed to login');
				});

			}, 0);
		} else {
			rejectLogin('Invalid auth method');
		}
	};

	function checkPopup(type) {
		var secondsOpened = 0;
		var twitterWindow = $interval(function() {
			secondsOpened++;
			//hard close after 60 seconds
			if (secondsOpened === 60 && window[type + 'Popup'] && window[type + 'Popup'].close) {
				window[type + 'Popup'].close();
			}
			if (secondsOpened === 20 && type === 'google') {
				$scope.loggingIn[type] = false;
				$interval.cancel(twitterWindow);
			}
			if (window[type + 'Popup'] && window[type + 'Popup'].closed) {
				$scope.loggingIn[type] = false;
				$interval.cancel(twitterWindow);
			}
		}, 1000);
	}

	var rejectLogin = function(reason) {
		//if (soft) {
			$modalInstance.dismiss(reason);
		//}
	};
	if (!soft)
		rejectLogin("m");
})

;
