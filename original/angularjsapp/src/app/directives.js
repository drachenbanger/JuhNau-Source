
angular.module('younow.directives', [])


.directive('intlTelInput', ["config", "$timeout", "Api", "$rootScope", "trackingPixel", "session", "swf", function(config, $timeout, Api, $rootScope, trackingPixel, session, swf) {
	return {
		restrict: 'A',
		link: function(scope, elem, attrs) {
			var input, id, button;
			$timeout(function() {
				id = '#' + attrs.id;
				input = window.$(id);
				button = elem.siblings('.btn');

				button.on('click', validateInput);

				elem.on('keydown', function(e) {
					if (e && e.keyCode === 13) {
						validateInput();
					}
				});
				input.intlTelInput({
					utilsScript: config.settings.ServerCDNBaseUrl + '/angularjsapp/vendor/static/libphonenumber.js'
				});
				//cleanup
				scope.$on('$destroy', function() {
					input.intlTelInput("destroy");
				});
			});

			function postToTwilio(number) {
				trackingPixel.trackClick('GETTHEAPP', {
					field1: 'TWILLIO'
				});

				var params = {
					number: number
				};

				if (session.user && session.user.userId) {
					params.userId = session.user.userId;
				}

				if (swf.broadcast && swf.broadcast.broadcastId) {
					params.broadcastId = swf.broadcast.broadcastId;
				}

				number = number.replace('+', '');
				Api.post('younow/sendToPhone', params).then(function(response) {
					if (response.data.result && response.data.result === "Success") {
						scope.twilioSuccess = true;
					}
				});
			}

			function validateInput() {
				$rootScope.gaEvent('Conversion', 'Send App Attempt', trackingPixel.getUserLocation() || 'ANCILLARY');
				if (input) {
					if (input.intlTelInput('isValidNumber')) {
						postToTwilio(input.intlTelInput('getNumber'));
					} else {
						var errorCode = input.intlTelInput('getValidationError'),
							error;
						for (error in window.intlTelInputUtils.validationError) {
							if (window.intlTelInputUtils.validationError[error] === errorCode && error !== 'IS_POSSIBLE') {
								scope.errorMsg = error.toLowerCase().replace(/_/g, ' ').capitalize();
								scope.$apply();
								break;
							}
						}
						Api.triggerTooltip(elem);
					}
				}
			}
		}
	};
}])



;
