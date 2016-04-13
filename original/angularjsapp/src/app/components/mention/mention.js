angular.module('younow.mention', [])

// This lets us create a div that is editable like a textarea
.directive('contenteditable', ["$sce", "$timeout", function($sce, $timeout) {
	return {
		restrict: 'A', // only activate on element attribute
		require: '?ngModel', // get a hold of NgModelController
		link: function(scope, element, attrs, ngModel) {
			function read() {
				var html = element.html();
				// When we clear the content editable the browser leaves a <br> behind
				// If strip-br attribute is provided then we strip this out
				if (attrs.stripBr && html === '<br>') {
					html = '';
				}
				ngModel.$setViewValue(html);
			}

			if (!ngModel) {
				return;
			} // do nothing if no ng-model

			// Specify how UI should be updated
			ngModel.$render = function() {
				if (ngModel.$viewValue !== element.html()) {
					element.html($sce.getTrustedHtml(ngModel.$viewValue || ''));
				}
			};

			// Listen for change events to enable binding
			element.on('blur keyup change', function() {
				$timeout(read);
			});
			read(); // initialize
		}
	};
}])

;
