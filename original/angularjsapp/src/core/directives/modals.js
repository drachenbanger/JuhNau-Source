(function() {


	angular.module('younow.core.directives')

	/**
	 * @ngdoc interface
	 * @name Modal Directives
	 * @description
	 *
	 * The Modal Directives are part of a set of base directives that our app uses for modals.
	 *
	 */


	/**
	 * @ngdoc directive
	 * @name ynModalDraggable
	 * @description
	 * ynModalDraggable allows users to drag a modal to another part of the browser window.
	 */
	.directive('ynModalDraggable', ["$timeout", "$document", "$window", function($timeout, $document, $window) {
		return {
			restrict: 'A',
			compile: function compile(scope, elem, attr, ctrl) {
				return {
					post: function postLink() {
						$timeout(function() {
							if (elem.$$element.parent().attr("window-class") !== "profile-summary-wrapper") {
								return false;
							}
							var element = elem.$$element,
								x, y;
							element.css({
								position: 'fixed',
								left: '40%'
							});
							element.on('mousedown', function(event) {
								var noDragging = false;
								//prevent dragging if element clicked does not have the draggable class
								if (event.originalEvent.target.className.indexOf("yn-modal-draggable") === -1) {
									noDragging = true;
								}

								//prevent dragging when element is a button, textarea or input
								if (event.originalEvent.target.tagName === 'TEXTAREA' || event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON') {
									noDragging = true;
								}
								if (!noDragging) {
									element.css({
										cursor: 'move'
									});
									//prevent dragging on right click
									if (event.originalEvent.which === 3) {
										return false;
									}
									// Prevent default dragging of selected content
									event.preventDefault();
									$document.on('mousemove', mousemove);
									$document.on('mouseup', mouseup);
								}
							});

							function mousemove(event) {
								angular.element(document.getElementById('modalWindow'))[0].style.setProperty('top', '0', 'important');
								y = event.clientY - element[0].clientHeight;
								x = event.clientX - (element[0].clientWidth / 2);
								element.css({
									top: y + 'px',
									left: x + 'px'
								});
							}

							function mouseup() {
								element.css({
									cursor: 'default'
								});
								$document.unbind('mousemove', mousemove);
								$document.unbind('mouseup', mouseup);
							}
						}, 0);
					}
				};
			}
		};
	}])

	/**
	 * @ngdoc directive
	 * @name windowClass
	 * @description
	 * windowClass toggles a class on timeout
	 */
	.directive('windowClass', ["$timeout", function($timeout) {
		return {
			restrict: 'A',
			compile: function compile(scope, elem, attr, ctrl) {
				return {
					post: function postLink() {
						$timeout(function() {
							angular.element(elem.$$element[0]).removeClass(elem.windowClass);
							angular.element(elem.$$element[0]).children().addClass(elem.windowClass);
						}, 0);
					}
				};
			}
		};
	}])

	;

})();
