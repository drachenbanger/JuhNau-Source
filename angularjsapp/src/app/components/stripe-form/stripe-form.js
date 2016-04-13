angular.module('younow.stripe', [])

.directive('stripeForm', function($window) {
	return {
		restrict: 'E',
		templateUrl: 'angularjsapp/src/app/components/stripe-form/stripe-form.tpl.html',
		scope: {
			stripeCallback: '&'
		},
		link: function(scope, element, attributes) {
			var form = element.find('form');

			function toggleButton(disabled) {
				scope.component.formSubmitting = disabled;
				angular.element(form).find('button').prop('disabled', disabled);
			}

			function stripeCb(status, response) {
				if (response.error) {
					scope.component.errorMessage = response.error.message;
				} else {
					scope.component.errorMessage = null;
				}
				if (scope.stripeCallback !== undefined) {
					var stripePromise = scope.stripeCallback()(response.id, 'stripe');
					if (stripePromise && stripePromise.then) {
						stripePromise.then(function() {
							toggleButton(false);
						});
					} else {
						toggleButton(false);
					}
				} else {
					toggleButton(false);
				}
			}

			scope.component = {};
			scope.component.ccRegex = "^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})$";
			scope.component.cvvRegex = "^[0-9]{3,4}$";
			scope.component.moRegex = "(0[1-9])|(1[012])";
			scope.component.yrRegex = "^[0-9]{4}$";
			scope.component.submitForm = function(e) {
				scope.component.formSubmitted = true;
				e.preventDefault();
				if (scope.stripeForm.$valid) {
					toggleButton(true);
					$window.Stripe.card.createToken(form, stripeCb);
				}
			};
		}
	};
});
