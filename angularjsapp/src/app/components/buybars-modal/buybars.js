angular.module('younow.modals.buybars', [])

.controller('BuybarsModalCtrl', ["$scope", "$modalInstance", "session", "Api", "$interval", "$translate", "config", "$filter", "$rootScope", "$timeout", "$modal", "trackingPixel",
	function($scope, $modalInstance, session, Api, $interval, $translate, config, $filter, $rootScope, $timeout, $modal, trackingPixel) {
		$scope.Api = Api;
		$scope.session = session;
		$scope.activeItem = false;
		$scope.config = config;
		$scope.disableBuy = true;
		var paypalwindow, paypalToken;

		$scope.paypalCheckout = function() {
			var wLeft = window.screenLeft ? window.screenLeft : window.screenX;
			var wTop = window.screenTop ? window.screenTop : window.screenY;
			var left = wLeft + (window.innerWidth / 2) - (800 / 2);
			var top = wTop + (window.innerHeight / 2) - (650 / 2);
			paypalwindow = window.open(config.settings.PayPalIncontextUrl + paypalToken, "", 'width=800, height=650, top=' + top + ', left=' + left);

			var watch = $scope.$watch(function() {
				return paypalwindow.location;
			}, function(newVal, oldVal) {
				try {
					if (newVal.pathname == "/api/paypal/paypalReturn.php") {
						var details = paypalwindow.getPayPalDetails();
						storeBuyHandler({
							data: details
						});
						paypalwindow.close();
						watch();
					}
					if (newVal.pathname == "/api/paypal/paypalCancel.php") {
						paypalwindow.close();
						watch();
					}
				} catch (err) {}
			});
		};

		$scope.buyRequest = function(token, vendor) {
			var params = {
				data: $scope.activeItem.price,
				signature: token,
				sku: $scope.activeItem.SKU,
				userId: session.user.userId,
				device_data: vendor == 'braintree' ? undefined : document.getElementById('device_data').value,
				vendor: vendor
			};
			if (window.location.protocol === 'http:') {
				params.s = session.user.session;
			}
			$scope.disableBuy = true;
			Api.post('store/buy', params, true)
				.then(function(response) {
					storeBuyHandler(response);
				});
		};

		trackingPixel.trackClick('BUYBARS');

		//get a list of all products
		Api.get('store/products', {
				store: 'web',
				lang: config.UILanguage
			}, true)
			.then(function(response) {
				// error
				if (response.data.errorCode === 6032) {
					$rootScope.gaEvent('PURCHASE', 'ERROR_6032', 'INLINE', ($scope.activeItem ? Math.round($scope.activeItem.price) : 0));
					$modalInstance.close();
					$timeout(function() {
						$modal.spendingFailed({
							purchaseItem: 'bars'
						});
					}, 200);
				}
				// other error
				else if (response.data.errorCode) {
					$modalInstance.close();
				}
				// regular
				console.log('products', response.data.products);
				for (var ea in response.data.products) {
					response.data.products[ea].amount = parseInt(response.data.products[ea].amount);
					response.data.products[ea].bonusCoins = response.data.products[ea].amount * 3;
					response.data.products[ea].bonusBars = Math.floor(response.data.products[ea].amount * 0.05);
				}
				$scope.products = response.data.products;
			});

		$scope.cancel = function() {
			if ($scope.activeItem && $scope.activeItem.price && config.buybarsiframeActive) {
				$rootScope.gaEvent('PURCHASE', 'CANCEL', 'IFRAME', Math.round($scope.activeItem.price));
			} else {
				$rootScope.gaEvent('PURCHASE', 'CLOSE', 'IFRAME');
			}

			$modalInstance.dismiss('Modal (buy bars) closed');
		};

		$scope.cancelPayment = function() {
			config.buybarsiframeActive = false;
		};

		$scope.toggleActiveItem = function(item) {
			if (item) {
				$scope.gettingToken = true;
				$rootScope.gaEvent('PURCHASE', 'SELECT', 'IFRAME', Math.round(item.price));
			} else {
				$rootScope.gaEvent('PURCHASE', 'CANCEL', 'IFRAME', Math.round($scope.activeItem.price));
			}
			if ($scope.activeItem.buying) {
				$scope.activeItem.buying = false;
				$scope.modalLarge = false;
			} else {
				getPurchaseToken(item).then(function() {
					$scope.gettingToken = false;
					$scope.activeItem = item;
					$scope.activeItem.buying = true;
					var followHeight;

					followHeight = $interval(function() {
						if (angular.element(document.getElementById('braintree-form'))[0]) {
							if (angular.element(document.getElementById('braintree-form'))[0].offsetHeight >= 250) {
								$scope.modalLarge = true;
							}
						} else {
							$interval.cancel(followHeight);
							$scope.modalLarge = false;
						}
					}, 500);
				});
			}
		};

		function getPurchaseToken(item) {
			//get the one time purchase token for this user
			var params = {
				userId: session.user.userId,
				amount: item.price,
				name: item.name,
				sku: item.SKU,
				origin: 'webBars'
			};
			if (window.location.protocol === 'http:') {
				params.s = session.user.session;
			}

			var apiResponse = Api.post('store/purchaseToken', params, true);

			apiResponse.then(function(response) {
				//check for user's trusted status
				if (response.data.vendor == 'paypal') {
					$scope.vendor = 'payPal';
					$scope.copy = {
						title: 'Get YouNow Bars',
						subtitle: 'Bars allow you to buy premium gifts for the broadcaster.'
					};
				} else {
					$scope.vendor = 'braintree';
					$scope.copy = {
						title: 'Select Payment Method',
						subtitle: 'Enter your credit card information below.'
					};
				}

				//cc verification state enabled
				if (response.data.errorCode === 6020 && response.data.ccVerificationSaleDetails) {
					var parsedResult = JSON.parse(response.data.ccVerificationSaleDetails);
					$modalInstance.close();
					$timeout(function() {
						$modal.verification(parsedResult, {
							source: 'buyBars'
						});
					}, 200);
				}
				//failed cc verification status
				else if (response.data.errorCode === 6021) {
					$modalInstance.close();
					$timeout(function() {
						$modal.ccVerified({
							type: 'verified-failed'
						});
					}, 200);
				}
				// error
				else if (response.data.errorCode === 6032) {
					$rootScope.gaEvent('PURCHASE', 'ERROR_6032', 'INLINE', ($scope.activeItem ? Math.round($scope.activeItem.price) : 0));
					$modalInstance.close();
					$timeout(function() {
						$modal.spendingFailed({
							purchaseItem: 'bars'
						});
					}, 200);
				}
				// other error
				else if (response.data.errorCode) {
					$modalInstance.close();
				}
				//braintree
				else if (response.data.errorCode === 0 && document.getElementById('braintree-dropin') && $scope.vendor == 'braintree' && $scope.disableBuy) {
					// set up braintree
					window.braintree.setup(
						response.data.token,
						'dropin', {
							container: 'braintree-dropin',
							paymentMethodNonceReceived: function(event, nonce) {
								$scope.buyRequest(nonce, 'braintree');
							}
						});
					if (window.BraintreeData) {
						var env = window.BraintreeData.environments[config.settings.BTEnv].withId(config.settings.BTKountId);
						window.BraintreeData.setup(config.settings.BTMerchantId, 'braintree-form', env);
					}
				}
				//paypal
				if (response.data.token && $scope.vendor == 'payPal') {
					paypalToken = response.data.token;
				}
				if ($scope.disableBuy) {
					$scope.disableBuy = false;
				}
			});
			return apiResponse;
		}

		function storeBuyHandler(response) {
			if (response.data.errorCode === 0 && response.data.bars) {
				session.user.vault.webBars = Number(response.data.bars);
				$rootScope.gaEvent('PURCHASE', 'SUCCESS', 'INLINE', Math.round($scope.activeItem.price));
				if (response.data.isVerificationSale && response.data.ccVerificationSaleDetails) {
					var saleDetails = response.data.ccVerificationSaleDetails;
					saleDetails.justPurchased = true;
					$modalInstance.close();
					$timeout(function() {
						$modal.verification(saleDetails, {
							source: 'buyBars'
						});
					}, 200);
				} else {
					$modalInstance.close($scope.activeItem);
					Api.showTopNotification('Purchase successful. You now have ' + session.user.vault.webBars + ' bars!', 'success');

					if (response.data.vipSpenderMessage) {

						$modal.vip_welcome(response.data.vipSpenderMessage);

					}

				}
			} else if (response.data.errorCode === 0 && !response.data.bars) {
				$modalInstance.dismiss(response.data.errorCode);
				Api.showTopNotification('Oops! Something went wrong. Please email support@younow.com to review this matter.');
				$rootScope.gaEvent('PURCHASE', 'ERROR_' + response.data.errorCode, 'INLINE', Math.round($scope.activeItem.price));
			} else {
				$modalInstance.dismiss(response.data.errorCode);
				$rootScope.gaEvent('PURCHASE', 'ERROR_' + response.data.errorCode, 'INLINE', Math.round($scope.activeItem.price));
				if (response.data.errorCode === 6013 && response.data.paymentType != "paypal_account") {
					$modal.spendingRedirect();
				} else {
					Api.showTopNotification(response.data.errorMsg);
				}
			}
		}
	}
]);
