(function() {


	angular.module('younow.core.directives')
		/**
		 * @ngdoc interface
		 * @name Scrolling Directives
		 * @description
		 *
		 * The Scrolling Directives are part of a set of base directives that our app uses.
		 *
		 */


	/**
	 * @ngdoc directive
	 * @name scrolledClass
	 * @description
	 * add class "scrolled" when scrolled to value specified by directive attribute
	 */

	.directive('scrolledClass', function($window) {
		return {
			restrict: 'A',
			scope: {
				scrolledClass: '@'
			},
			link: function(scope, element, attrs) {
				angular.element($window).on("scroll", function() {
					if (this.pageYOffset > (scope.scrolledClass || 0)) {
						element.addClass('scrolled');
					} else {
						element.removeClass('scrolled');
					}
				});
				scope.$on('$destroy', function() {
					angular.element($window).off("scroll");
				});
			}
		};
	})


	/**
	 * @ngdoc directive
	 * @name onlyScroll
	 * @description
	 * onlyScroll prevents mouse scrolling when used as an attribute of an HTML
	 * element. If a user's tries to mousewheel while "on" an element with only-scroll,
	 * it will not work.
	 */

	.directive('onlyScroll', function() {
		return {
			restrict: 'A',
			link: function(scope, element, attrs) {
				var horizontalScroll = element[0].attributes['horizontal-scroll'];

				element.on('mousewheel', function(event) {
					event.preventDefault();

					if (horizontalScroll === undefined) {
						element.scrollTop(element.scrollTop() - event.originalEvent.wheelDelta);
					} else {
						element.scrollLeft(element.scrollLeft() - event.originalEvent.wheelDelta);
					}

				});
			}
		};
	})


	/**
	 * @ngdoc directive
	 * @name infiniteScroll
	 * @description
	 * infiniteScroll dynamically appends scrollable content to the end of a given
	 * section once the user nears the end of existing content
	 */
	.directive('infiniteScroll', ["$window", "$document", function($window, $document) {
		return {
			scope: {
				infiniteScroll: '&',
				canLoad: '&'
			},
			link: function(scope, element, attrs) {
				var offset = parseInt(attrs.threshold) || 0;
				var e = element[0];
				var atBottom = function() {
					return e.scrollTop + e.offsetHeight >= e.scrollHeight - offset;
				};

				var scrollHandler = function() {
					if (!scope.loading && scope.canLoad() && atBottom()) {
						scope.loading = true;
						var request = scope.infiniteScroll();
						if (request && request.then) {
							request.then(function() {
								scope.loading = false;
							});
						} else {
							scope.loading = false;
						}
					}
				};

				// Handle differently if watching the whole page for scroll
				if (attrs.pagescroll) {
					//setup destroy function to remove the document's on scroll handler when original element gets destroyed
					element.on('$destroy', function() {
						$document.unbind('scroll', scrollHandler);
					});
					//set element to document
					element = $document;
					atBottom = function() {
						return $document.scrollTop() + $window.innerHeight >= $document[0].body.offsetHeight - offset;
					};
				}

				if (scope.canLoad() === undefined) {
					scope.canLoad = function() {
						return true;
					};
				}

				element.bind('scroll', scrollHandler);
			}
		};
	}])

	;

})();
