(function() {

	window.clearSelection = function() {
		var sel;
		if ((sel = document.selection) && sel.empty) {
			sel.empty();
		} else {
			if (window.getSelection) {
				window.getSelection().removeAllRanges();
			}
			var activeEl = document.activeElement;
			if (activeEl) {
				var tagName = activeEl.nodeName.toLowerCase();
				if (tagName == "textarea" ||
					(tagName == "input" && activeEl.type == "text")) {
					// Collapse the selection to the end
					activeEl.selectionStart = activeEl.selectionEnd;
				}
			}
		}
	};

	angular.module('younow.core.directives')

	/**
	 * @ngdoc interface
	 * @name Utility Directives
	 * @description
	 *
	 * The Utility Directives are flow improvers. They take care of many
	 * desired default behaviors on click, enter, change or submit.
	 */


	/**
	 * @ngdoc directive
	 * @name ynEnter
	 * @description
	 * ynEnter works like an ng-click. It fires a function on enter.
	 */
	.directive('ynEnter', function() {
		return {
			restrict: 'A',
			link: function(scope, elements, attrs) {
				elements.bind('keydown keypress', function(event) {
					if (event.which === 13) {
						scope.$apply(function() {
							scope.$eval(attrs.ynEnter);
						});
						event.preventDefault();
					}
				});
			}
		};
	})


	/**
	 * @ngdoc directive
	 * @name preventDefault
	 * @description
	 * preventDefault checks for ng-click, an empty href, or an href set to '#'.
	 * If those condidtions are found it prevents default behavior on click/double click.
	 */
	.directive('preventDefault', function() {
		return {
			restrict: 'A',
			link: function(scope, elem, attrs) {
				if (attrs.ngClick || attrs.href === '' || attrs.href === '#') {
					elem.on('click dblclick', function(e) {
						e.preventDefault();
					});
				}
			}
		};
	})


	/**
	 * @ngdoc directive
	 * @name copyOnClick
	 * @description
	 * copyOnClick copies a selection to your clipboard on click
	 */
	.directive('copyOnClick', function($timeout) {
		return {
			restrict: 'A',
			link: function(scope, element, attrs) {
				element.on('click', function() {
					this.select();
					//window.document.designMode='on';
					if (window.document.execCommand('copy')) {
						window.copyHref = angular.element(this);
						window.copyHref.trigger('hrefCopied');
						$timeout(function() {
							window.copyHref.trigger('hrefCopied');
							window.clearSelection();
						}, 1000);
					}
				});
			}
		};
	})

	/**
	 * @ngdoc directive
	 * @name ynOnChange
	 * @description
	 * ynOnChange triggers a function on a change event
	 */
	.directive('ynOnChange', function() {
		return {
			restrict: 'A',
			link: function(scope, element, attrs) {
				var onChangeHandler = scope.$eval(attrs.ynOnChange);
				element.bind('change', function(event) {
					var params = attrs.params.split(',');
					for (var i = 0; i < params.length; i++) {
						if (params[i] !== 'event' && params[i] !== '$event') {
							if (scope[params[i]] !== undefined) {
								params[i] = scope[params[i]];
							} else {
								params.splice(i, 1);
							}
						} else {
							params[i] = event;
						}
					}
					onChangeHandler.apply(this, params);
				});
			}
		};
	})

	/**
	 * @ngdoc directive
	 * @name cameraValid
	 * @description
	 * cameraValid checks for a functioning camera stream
	 */
	.directive('cameraValid', function($interval) {
		return {
			restrict: 'A',
			scope: {
				onValid: '&',
				onInvalid: '&'
			},
			link: function(scope, ele, attrs) {
				var attemptsLeft = 20;
				var checkForDuration;
				if (ele[0].tagName == 'VIDEO') {
					ele[0].onplay = function() {
						if (checkForDuration !== undefined) {
							$interval.cancel(checkForDuration);
							attemptsLeft = 20;
						}
						checkForDuration = $interval(function() {
							if (attemptsLeft > 0) {
								--attemptsLeft;
							} else {
								$interval.cancel(checkForDuration);
							}
							//Straight from WC3:
							// A Number, representing the length of the video, in seconds. If no video is set, "NaN" (Not-a-Number) is returned.
							// If the video is streamed and has no predefined length, "Inf" (Infinity) is returned.
							// Assume "video" is the video node
							if (ele[0].readyState > 0 || !attemptsLeft) {
								if (ele[0].duration === Infinity && scope.onValid !== undefined) {
									scope.onValid();
								}
								if (ele[0].duration !== Infinity && scope.onInvalid !== undefined) {
									scope.onInvalid();
								}
								$interval.cancel(checkForDuration);
							}

						}, 200);
					};
					scope.$on('$destroy', function() {
						if (checkForDuration !== undefined) {
							$interval.cancel(checkForDuration);
						}
					});
				} else {
					throw new Error('This element must be a tag! ' + (ele.id || ''));
				}
			}
		};
	})


	/**
	 * @ngdoc directive
	 * @name passFocusTo
	 * @description
	 * passFocusTo passes the browser focus to a given element B with an ID on click of element A
	 */
	.directive('passFocusTo', function($timeout, $window) {
		return {
			link: function(scope, element, attrs) {
				element.on('click', function($event) {
					if ($window.getSelection().toString().length > 0) {
						return false;
					}
					$timeout(function() {
						var elem = element.parent();
						while (elem[0].id != attrs.focusParent) {
							elem = elem.parent();
						}
						elem.find("#" + attrs.passFocusTo)[0].focus();
					});
				});
			}
		};
	})


	/**
	 * @ngdoc directive
	 * @name dynamicAlert
	 * @description
	 * dynamicAlert passes the browser focus to a given element B on click of element A
	 */
	.directive('dynamicAlert', ["$compile", function($compile) {
		return {
			restrict: 'A',
			replace: true,
			link: function(scope, ele, attrs) {
				scope.$watch(attrs.dynamicAlert, function(html) {
					ele.html(html);
					$compile(ele.contents())(scope);
				});
			}
		};
	}])

	/**
	 * @ngdoc directive
	 * @name languageSelect
	 * @description
	 * languageSelect adds a class to the element on hover, to show drop-up menu
	 */
	.directive('languageSelect', function() {
		return {
			restrict: 'A',
			link: function(scope, elem, attrs) {
				elem.on('mouseenter', function(e) {
					elem.addClass('selected');
				});
				elem.on('mouseleave', function(e) {
					elem.removeClass('selected');
				});
			}
		};
	})

	;

})();
