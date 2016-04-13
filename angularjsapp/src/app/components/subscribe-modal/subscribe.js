angular.module('younow.modals.subscribe-modal', [])
	.controller('SubscribeModalCtrl', ["$rootScope", "$scope", "$modalInstance", "$timeout", "$location", "config", "Api", "session", "broadcasterService", "params", "eventbus", "trackingPixel", "$modal", "swf", function($rootScope, $scope, $modalInstance, $timeout, $location, config, Api, session, broadcasterService, params, eventbus, trackingPixel, $modal, swf) {

		// PARAMS pass in params.sub.subscriptionId to do "store/chaneSubscriptionPayment" instead of "store/buy"
		var ga = {};
		var vm = {};
		vm.channelId = params.channelId;
		vm.subscription = params.sub || {};
		vm.template = {};
		vm.template.cdn = config.settings.ServerCDNBaseUrl;
		vm.session = session;
		vm.spanel = params.state || 'initial';

		var vm_channel = function(vmchannel) {
			if (!vmchannel || !vmchannel.userId) {
				return false;
			}
			// user
			vm.channel = vmchannel;
			vm.template.channelThumb = config.settings.ServerCDNBaseUrl + '/php/api/channel/getImage/channelId=' + vm.channel.userId;
			if (vm.spanel != 'initial') {
				vm.sub = {};
				vm.submitting = true;
				Api.get('store/subscriptionProducts', {
					store: 'web',
					channelId: vm.channel.userId,
					lang: config.UILanguage
				}, true).then(function(response) {
					if (response.data && response.data.products) {
						vm.sub = response.data.products[0];
					}
				});
			}
			// get products
			vm.sub = {};
			var post = {
				store: 'web',
				channelId: vm.channel.userId,
				lang: config.UILanguage
			};
			vm.submitting = true;
			Api.get('store/subscriptionProducts', post, true).then(function(response) {
				vm.submitting = false;
				// set
				vm.sub = {};
				vm.sub.id = response.data.products[0].id;
				vm.sub.SKU = response.data.products[0].SKU;
				vm.sub.name = response.data.products[0].name;
				vm.sub.price = response.data.products[0].price;
			});
			// tracking
			ga.userLocation = params.source || trackingPixel.getUserLocation(); //  MINIPROFILE  ||  PROFILE
			if (vm.channel.chatMode) {
				ga.category = 'SUBSCRIBE_CHATMODE';
				ga.action_x = '';
				ga.location = 'LIVE_SUB';
				ga.origin = 'BROADCAST';
			} else if (params.source == 'MINI_PROFILE') {
				ga.category = 'SUBSCRIBE_MINIPROFILE';
				if (vm.channel.broadcastId) {
					ga.action_x = '_LIVE';
					ga.location = 'LIVE';
				} else {
					ga.action_x = '_OFFLINE';
					ga.location = 'OFFLINE';
				}
				ga.origin = 'MINI_PROFILE';
			} else if (ga.userLocation == 'PROFILE') {
				ga.category = 'SUBSCRIBE_PROFILE';
				if (vm.channel.broadcastId) {
					ga.action_x = '_LIVE';
					ga.location = 'LIVE';
				} else {
					ga.action_x = '_OFFLINE';
					ga.location = 'OFFLINE';
				}
				ga.origin = 'PROFILE';
			} else if (vm.channel.broadcastId) {
				ga.category = 'SUBSCRIBE_BROADCAST';
				ga.action_x = '';
				ga.location = 'LIVE';
				ga.origin = 'BROADCAST';
			} else {
				ga.category = 'SUBSCRIBE_' + ga.userLocation.toUpperCase();
				ga.action_x = '';
				ga.location = 'SETTINGS';
				ga.origin = 'SETTINGS';
			}
			$rootScope.gaEvent(ga.category, 'PROMPT' + ga.action_x, 'LEVEL1');
			trackingPixel.capture({
				event: 'SUB_CLICK',
				coins: session.fanStatus[vm.channel.userId] ? 1 : 0,
				extradata: 'PROMPT'
			});
		};
		vm_channel(broadcasterService.channel || broadcasterService.broadcaster);
		if (!vm.channel || (params.channelId != vm.channel.userId)) {
			Api.get('channel/getInfo', {
				channelId: params.channelId
			}, true).then(function(response) {
				vm_channel(response.data);
			});
		}
		vm.template.userThumb = config.settings.ServerCDNBaseUrl + '/php/api/channel/getImage/channelId=' + session.user.userId;
		vm.template.noThumb = config.settings.ServerCDNBaseUrl + '/images/nothumb.jpg';
		vm.globalVars = window.globalVars;
		vm.config = config;
		vm.submitting = false;
		vm.braintreeLoading = true;

		// INIT
		// fan
		var autofan = function() {
			// FAN if not already
			if (!session.fanStatus[vm.channel.userId]) {

				$rootScope.gaEvent('Conversion', 'Fan (Attempt)', 'AUTOFAN-SUBCRIBING');
				var apiPost = {
					userId: session.user.userId,
					channelId: vm.channel.userId
				};
				if (vm.channel && vm.channel.broadcastId) {
					apiPost.broadcastId = vm.channel.broadcastId;
				}
				Api.post('channel/fan', apiPost).then(function(response) {
					if (response.data && !response.data.errorCode) {
						// successfully fanned! silent
						session.fanStatus[vm.channel.userId] = true;
						vm.channel.totalFans = vm.channel.totalFans * 1 + 1;
					}
				});

			}
		};

		// BRAINTREE
		var post = {
			userId: session.user.userId
		};
		if (window.location.protocol === 'http:') {
			post.s = session.user.session;
		}
		vm.submitting = true;
		Api.post('store/purchaseToken', post, true).then(function(response) {
			vm.submitting = false;

			// error
			if (response.data.errorCode === 6032) {
				$rootScope.gaEvent('PURCHASE', 'ERROR_6032', 'INLINE', 'SUBSCRIPTION');
				$modalInstance.close();
				$timeout(function() {
					$modal.spendingFailed({purchaseItem:'subscription'});
				}, 200);
			} else if (response.data.errorCode === 6020 && response.data.ccVerificationSaleDetails) {
				var parsedResult = JSON.parse(response.data.ccVerificationSaleDetails);
				parsedResult.channelId = params.channelId;
				$modalInstance.close();
				$timeout(function() {
					$modal.verification(parsedResult, {
						source: 'subscribeModal'
					});
				}, 200);
			} else if (response.data.errorCode === 6021) {
				$modalInstance.close();
				$timeout(function() {
					$modal.ccVerified({
						type: 'verified-failed'
					});
				}, 200);
			}
			// other error
			else if (response.data.errorCode) {
				$modalInstance.close();
			}

			if (response.data.errorCode === 0 && document.getElementById('braintree-dropin')) {
				// load - braintree
				window.braintree.setup(
					response.data.token,
					'dropin', {
						container: 'braintree-dropin',
						onReady: function() {
							vm.braintreeLoading = false;
						},
						paymentMethodNonceReceived: function(event, nonce) {
							vm.braintreeLoading = false;

							// post
							var post = {
								data: $scope.vm.sub.price,
								signature: nonce,
								sku: $scope.vm.sub.SKU,
								userId: session.user.userId,
								device_data: document.getElementById('device_data').value,
								channelId: vm.channel.userId,
								origin: ga.origin
							};
							if (window.location.protocol === 'http:') {
								post.s = session.user.session;
							}
							var method = 'store/buy';
							if (vm.subscription && vm.subscription.subscriptionId) {
								method = 'store/changeSubscriptionPayment';
								post.subscriptionId = vm.subscription.subscriptionId;
							}

							// fan
							autofan();

							// sub
							vm.submitting = true;
							Api.post(method, post, true).then(function(response) {
								vm.submitting = false;

								// error
								if (response.data.errorCode === 6032) {
									$rootScope.gaEvent('PURCHASE', 'ERROR_6032', 'INLINE', 'SUBSCRIPTION');
									$modalInstance.close();
									$timeout(function() {
										$modal.spendingFailed({purchaseItem:'subscription'});
									}, 200);
								} 
								// other error
								else if (response.data.errorCode) {
									$modalInstance.close();
								}

								// success
								else if (!response.data.errorCode) {

									// changed payment
									if (method == 'store/changeSubscriptionPayment') {
										$modalInstance.close();
										Api.showTopNotification('Thank you! Your payment information has been updated.', 'success');

										// new subscription
									} else {
										window.YouNow.reloadSubscriptions = true;
										if (swf.broadcast) {
											$modalInstance.dismiss();
										} else {
											vm.spanel = 'thankyou';
										}
										Api.showTopNotification('You have subscribed to ' + vm.channel.profile + '!', 'success');
										$rootScope.gaEvent(ga.category, 'SUBSCRIBE' + ga.action_x, 'LEVEL1');
										trackingPixel.capture({
											event: 'SUB_CLICK',
											coins: session.fanStatus[vm.channel.userId] ? 1 : 0,
											extradata: 'SUBSCRIBE'
										});
															
										if (response.data.vipSpenderMessage) {

											$modal.vip_welcome(response.data.vipSpenderMessage);

										}
										
									}
									session.subStatus[post.channelId] = true;

									// failed
								} else {

									console.info(method + ' failed:', response.data);
									Api.showTopNotification(JSON.stringify(response.data));

								}

							});

						}
					});
				if (window.BraintreeData) {
					// var env = window.BraintreeData.environments[config.settings.BTEnv];
					var env = window.BraintreeData.environments[config.settings.BTEnv].withId(config.settings.BTKountId);
					window.BraintreeData.setup(config.settings.BTMerchantId, 'braintree-form', env);
				}
			}
		});

		// INITIAL
		vm.submitInitial = function() {

			// next
			if (session.user.email && session.user.isEmailConfirmed) {
				vm.spanel = 'payment';
				$rootScope.gaEvent(ga.category, 'PAYVIEW' + ga.action_x, 'LEVEL1');
				trackingPixel.capture({
					event: 'SUB_CLICK',
					coins: session.fanStatus[vm.channel.userId] ? 1 : 0,
					extradata: 'PAYVIEW'
				});
			} else {
				vm.spanel = 'email';
				trackingPixel.capture({
					event: 'SUB_CLICK',
					coins: session.fanStatus[vm.channel.userId] ? 1 : 0,
					extradata: 'EMAIL'
				});
			}

		};


		// EMAIL
		vm.submitEmail = function(form) {
			vm.submitting = true;
			// validate
			if (form.$invalid) {
				eventbus.notifySubscribers('subscribeForm:invalid');
				return false;
			}

			// post
			var post = {
				userId: session.user.userId,
				channelId: session.user.userId,
				emailAddress: vm.session.user.email
			};
			Api.post('channel/updateSettings', post).then(function(response) {

				// success
				if (!response.errorCode) {
					vm.spanel = 'payment';
					$rootScope.gaEvent(ga.category, 'PAYVIEW' + ga.action_x, 'LEVEL1');
					trackingPixel.capture({
						event: 'SUB_CLICK',
						coins: session.fanStatus[vm.channel.userId] ? 1 : 0,
						extradata: 'PAYVIEW'
					});
				}
				vm.submitting = false;

			});

		};

		// CLOSE
		vm.closeThankyou = function() {
			$modalInstance.dismiss();
		};

		// CANCEL
		vm.cancelSubscription = function() {
			vm.cancelling = true;
			Api.post('channel/cancelSubscription', {
				userId: session.user.userId,
				subscriptionId: vm.subscription.subscriptionId,
				channelId: vm.channelId,
				origin: 'SETTINGS'
			}).success(function(response) {
				window.YouNow.reloadSubscriptions = true;
				vm.cancelling = false;
				if (!response.errorCode) {
					$modalInstance.dismiss();
					Api.showTopNotification('Cancellation successful. You will not be billed again.', 'success');
					session.subStatus[vm.channelId] = false;
				} else {
					console.info('channel/cancelSubscription failed:', response);
					Api.showTopNotification(JSON.stringify(response));
				}
			});
		};

		$scope.vm = vm;

	}])

/*
	VALIDATE FORM ELEMENT
*/
.directive('subscribeValidate', ['Api', '$compile', 'eventbus', function(Api, $compile, eventbus) {
	return {
		restrict: 'A',
		scope: {
			message: '@',
			isValid: '=' //should be a variable or an expression
		},
		link: function(scope, elem, attrs) {
			var tag = elem[0].tagName;

			function errorFeedback() {
				if (elem[0].className.indexOf('ng-invalid') !== -1) {
					Api.triggerTooltip(elem, 2500);
				}
			}
			if (tag == 'TEXTAREA' || tag == 'INPUT') {
				elem.on('blur', errorFeedback);
			}
			eventbus.subscribe('subscribeForm:invalid', errorFeedback, attrs.name, scope);
		}
	};
}])

;
