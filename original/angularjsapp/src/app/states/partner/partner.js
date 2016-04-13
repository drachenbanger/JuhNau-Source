angular.module('younow.partner', ['ui.router', 'younow.services.utils'])

.config(["$stateProvider", "$urlRouterProvider", "ApiProvider", function config($stateProvider, $urlRouterProvider, ApiProvider) {
	ApiProvider.reRouteHandler('/partner/earnings', '/partners/earnings');
	ApiProvider.reRouteHandler('/partner', '/partners');
	ApiProvider.reRouteHandler('/partners/', '/partners');
	ApiProvider.reRouteHandler('/partner.php', '/partners');

	$stateProvider
		.state('/partners/earnings', {
			url: '/partners/earnings',
			templateUrl: 'angularjsapp/src/app/states/partner/earnings.tpl.html',
			controller: 'partnerCtrl',
			controllerAs: 'vm'
		})
		.state('/partners/faq', {
			url: '/partners/faq',
			templateUrl: 'angularjsapp/src/app/states/partner/faq.tpl.html',
			controller: 'partnerCtrl',
			controllerAs: 'vm'
		})
		.state('/partners', {
			url: '/partners',
			templateUrl: 'angularjsapp/src/app/states/partner/partner.tpl.html',
			controller: 'partnerCtrl',
			controllerAs: 'vm'
		})
		.state('/partners/payment-settings', {
			url: '/partners/payment-settings',
			templateUrl: 'angularjsapp/src/app/states/partner/payment-settings.tpl.html',
			controller: 'paymentSettingsCtrl',
			controllerAs: 'vm'
		});
}])


.controller('paymentSettingsCtrl', function PaymentSettingsCtrl(Api, session, config) {
	var vm = this;
	vm.session = session;
	vm.iframeSrc = '';
	vm.mobile = false;

	function getDevice() {
		var parser = new window.UAParser();
		var device = parser.getDevice();
		return device.type;
	}

	function getTipaltiIframeSrc() {
		var device = getDevice();
		if (device === 'mobile') {
			vm.mobile = true;
		} else {
			var getRequest = Api.get('store/tipaltiIframeSrc', {
				'userId': session.user.userId,
				'lang': session.user.language
			});
			getRequest.then(function(response) {
				vm.iframeSrc = response.data.iframeSrc;
			});
		}
	}

	config.init.then(function() {
		getTipaltiIframeSrc();
	});

})

.directive('tipaltiIframe', function() {
	return {
		restrict: 'E',
		template: '<iframe id="tipaltiIframe" ng-src="{{vm.iframeSrc}}"></iframe>',
		replace: true,
		scope: true,
		link: function(scope, element, attributes) {

			var tipaltiHandler = function(evt) {
				if (evt.data && evt.data.TipaltiIframeInfo) {
					if (evt.data.TipaltiIframeInfo.height) {
						element.css({
							height: (evt.data.TipaltiIframeInfo.height + 20) + 'px'
						});
					}
					if (evt.data.TipaltiIframeInfo.width) {
						element.css({
							width: (evt.data.TipaltiIframeInfo.width + 40) + 'px'
						});
					}
				}
			};

			var srcWatcher = scope.$watch(function() {
				return element[0].src;
			}, function(newVal, oldVal) {
				if (newVal && newVal.length > 0) {
					if (window.addEventListener) {
						window.addEventListener("message", tipaltiHandler, false);
					} else {
						window.detachEvent("onmessage", tipaltiHandler);
					}
					//remove watcher
					srcWatcher();
				}
			});

			scope.$on('$destroy', function() {
				if (window.addEventListener) {
					window.removeEventListener("message", tipaltiHandler, false);
				} else {
					window.detachEvent("onmessage", tipaltiHandler);
				}
			});
		}

	};


})


.controller('partnerCtrl', ["$scope", "$rootScope", "Api", "$state", "session", "$location", "$http", "config", "$sce", "$timeout", "eventbus", "$compile", function($scope, $rootScope, Api, $state, session, $location, $http, config, $sce, $timeout, eventbus, $compile) {


	// initial
	var vm = this;
	vm.session = session;
	vm.config = config;


	// user actions
	vm.submitAgreeForm = function() {
		// validate
		vm.agreeFormInvalid = false;
		if (!vm.agreeFormChecked) {
			vm.agreeFormInvalid = true;
			return false;
		}
		// post
		vm.agreeFormProcessing = true;
		Api.post('channel/partnerForm', {
				userId: session.user.userId,
				channelId: session.user.userId,
				agree: 1
			})
			.success(function(data, status, headers, config) {
				vm.agreeFormProcessing = false;
				vm.agreeFormSuccess = true;
				// reload (update status)
				if (session.user.partner === 7) {
					$state.go('/partners/earnings');
				} else {
					session.user.partner = 1;
				}
			})
			.error(function(data, status, headers, config) {
				vm.agreeFormProcessing = false;
				vm.agreeFormError = true;
			});
	};

	vm.enablePendingForm = function() {
		vm.pendingForm = {};
	};

	vm.submitPendingForm = function() {
		// validate (just make sure front-end validation is not sending empty form)
		//TODO: Clean up validation in this form
		vm.pendingFormSubmitted = true;
		if (!vm.pendingForm.name) {
			return false;
		}
		// post
		vm.pendingFormProcessing = true;
		Api.post('channel/partnerForm', {
				userId: session.user.userId,
				channelId: session.user.userId,
				fullName: vm.pendingForm.name,
				email: vm.pendingForm.email,
				phone: vm.pendingForm.phone,
				socialLinks: vm.pendingForm.social,
				description: vm.pendingForm.about
			})
			.success(function(data, status, headers, config) {
				vm.pendingFormProcessing = false;
				if (!data.errorCode) {
					vm.pendingFormSuccess = true;
					// reload (update status)
					session.user.partner = 3;
					$state.go($state.current, {}, {
						reload: true
					});
				}
			})
			.error(function(data, status, headers, config) {
				vm.pendingFormProcessing = false;
				vm.pendingFormError = true;
			});
	};

	// send to view
	vm.getUsername = function() {
		return session.user.profile;
	};
	vm.validatePhonePattern = (function() {
		var regexp = /^\(?(\d{3})\)?[ .-]?(\d{3})[ .-]?(\d{4})$/;
		return {
			test: function(value) {
				return regexp.test(value);
			}
		};
	})();
	vm.validateEmailPattern = (function() {
		var regexp = /^\(?(\d{3})\)?[ .-]?(\d{3})[ .-]?(\d{4})$/;
		return {
			test: function(value) {
				return regexp.test(value);
			}
		};
	})();


	// FAQ
	vm.goToFaq = function() {
		$state.go('/partners/faq');
	};
	var showPartnersFaq = function() {
		if (session.loggedIn) {
			showPartnersFaqLoggedIn();
		} else if (!$scope.autoLoginAttempted) {
			$scope.autoLoginAttempted = true;
			var partnersFaqModal = session.showLoginModal('', 'PARTNERS_FAQ').result.then(showPartnersFaq);
			partnersFaqModal.result.then(function() {
				showPartnersFaqLoggedIn();
			});
			partnersFaqModal.result.catch(function() {
				$state.go('/partners');
			});
		}
		showPartnersFaqLoggedIn();

	};
	var showPartnersFaqLoggedIn = function() {
		if (session.user.partner == 1 || session.user.partner == 2 || session.user.partner == 3 || session.user.partner == 4 || session.user.partner == 6 || session.user.partner == 7) {

			if ($scope.gotIn) {
				return false;
			}
			$scope.gotIn = true;

			$http.get('https://api.github.com/repos/younow/younow.github.io/contents/policy/en/partners_faq.md', {
				'headers': {
					'Accept': 'application/vnd.github.v3.html'
				}
			}).success(function(data) {
				data = data.replace(/<li([\sa-zA-Z0-9"'=-]*)>/gi, function(e) {
					return '<li li-collapsed><i class="ynicon ynicon-btn-next"></i>';
				});
				data = data.replace(/EMBED-VIDEO/, '<iframe src="https://player.vimeo.com/video/130339308" width="500" height="281" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe> ');

				$scope.showFooter = true;
				// Attach doc to scope
				var doc = angular.element(document.getElementById('partnersFaqContent')).html($compile(data)($scope));
				// Ready after HTML has rendered
				$timeout(function() {
					if (doc.find("article").length) {
						$scope.infoPartnersFaqReady = true;
					}
				});
			});

		} else if (!session.user || !session.user.loggedIn) {
			$state.go('/partners');
		}
	};

	if ($state.current.url == '/partners/faq') {
		eventbus.subscribe('session:loggedIn', showPartnersFaq, 'partners-faq', $scope);
		$scope.$watch('session.user', function() {
			$timeout(function() {
				if (!session.user || !session.user.loggedIn) {
					showPartnersFaq();
				}
			}, 500);
		});
	}

	//$scope.vm = vm;
}])

.directive('liCollapsed', ["$compile", function($compile) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {

			element[0].classList.add('liCollapsed');

			element.on('click', function() {
				var removeClass = false;
				if (element[0].classList.contains('selected')) {
					removeClass = true;
				}

				var elems = document.querySelectorAll(".liCollapsed");
				[].forEach.call(elems, function(el) {
					el.classList.remove("selected");
				});

				if (!removeClass) {
					element[0].classList.add('selected');
				}
			});
		}
	};
}])

;

//# sourceURL=partner.js
