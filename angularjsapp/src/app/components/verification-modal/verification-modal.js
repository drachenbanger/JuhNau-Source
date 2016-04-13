angular.module('younow.modals.verification', [])

.controller('VerificationModalCtrl', ["$scope", "$modalInstance", "session", "Api", "config", "$rootScope", "$timeout", "data", "$modal",
	function($scope, $modalInstance, session, Api, config, $rootScope, $timeout, data, $modal) {
		$scope.data = data;
		$scope.session = session;
		$scope.config = config;
		$scope.verification = {
			processing: false,
			failed: false,
			invalid: false,
			active: false,
			verifyNowState: function() {
				$scope.verification.verifyNow = true;
				$timeout(function() {
					$scope.verification.animate = true;
				});
			}
		};

		var clearInvalid;

		function formatVerificationDetails(originalAmount, date, bars, last4, paymentType) {
			$scope.verification.sale = {
				originalAmount: originalAmount,
				last4: last4,
				low: Number(originalAmount) - 1.99,
				high: Number(originalAmount) - 0.01,
				date: date * 1000,
				barsAmount: bars,
				paymentType: paymentType
			};
			$scope.verification.active = true;
		}

		$scope.cancel = function() {
			$rootScope.gaEvent('PURCHASE', 'VERIFICATION_CANCEL');
			$modalInstance.dismiss();
		};


		$scope.verifyAmount = function() {
			$scope.verification.invalid = undefined;
			if (clearInvalid) {
				$timeout.cancel(clearInvalid);
			}
			if ($scope.verificationForm.$invalid) {
				$scope.verification.invalid = 'Oops. needs to include decimals, i.e. $1.99. Try again';
			} else if ($scope.verification.amount < $scope.verification.sale.low || $scope.verification.amount > $scope.verification.sale.high) {
				$scope.verification.invalid = 'That is an incorrect amount. Try again.';
			}

			if ($scope.verification.invalid) {
				Api.triggerTooltip('verification-tooltip', 2500);
				clearInvalid = $timeout(function() {
					$scope.verification.invalid = undefined;
				}, 2600);
			} else {
				$scope.verification.processing = true;
				//make the call in here to see if amount matches the verified amount
				Api.post('store/verifyCreditCard', {
						amount: $scope.verification.amount,
						userId: session.user.userId,
						s: session.user.session
					}, true)
					.then(function(response) {
						$scope.verification.processing = false;
						if (response.data && response.data.errorCode === 0) {
							$modalInstance.close();
							$timeout(function() {
								$modal.ccVerified({
									type: 'verified',
									data: data
								});
							}, 200);
						}
						if (response.data && response.data.errorCode === 6023) {
							if (response.data.remainingAttempts > 0) {
								$scope.verification.failed = true;
								$scope.verification.amountAttempted = angular.copy($scope.verification.amount);
							} else {
								$modalInstance.close();
								$timeout(function() {
									$modal.ccVerified({
										type: 'verified-failed',
										data: data
									});
								}, 200);
							}
						}
					});
			}
		};

		formatVerificationDetails(data.params.originalAmount, data.params.date, data.params.barsAmount, data.params.last4, data.params.paymentType);
		if (!data.params.justPurchased) {
			$scope.verification.verifyNowState();
		}

	}
])

.controller('CcVerifiedModalCtrl', ["$scope", "$modalInstance", "session", "data", "$modal",
	function($scope, $modalInstance, session, data, $modal) {
		data = data.data;
		$scope.cancel = function() {
			$modalInstance.dismiss();
		};

		$scope.continue = function() {
			$modalInstance.dismiss();
			if (data.source.source === 'buyBars') {
				$modal[data.source.source](session.user.spendingDisabled);
			} else if (data.source.source === 'subscribeModal') {
				$modal[data.source.source](data.params.channelId);
			}
		};

		$scope.contactSupport = function() {
			window.open("https://younow.zendesk.com/anonymous_requests/new?ticket[subject]=Credit+Card+Verification&ticket[ticket_form_id]=67755&ticket[fields][23984596]=" + session.user.fullName, '_blank');
		};
	}
])

;
