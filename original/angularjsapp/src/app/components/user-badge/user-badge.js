angular.module('younow.user-badge', [])

.value('UserBadge', window.YouNow.ReactComponents.UserBadge)

//react version for the guest list
.directive('userBadgeRt', function(reactDirective) {
	return reactDirective('UserBadge');
})

//one way bound
.directive('userBadge', ["broadcasterService", "config", function(broadcasterService, config) {
	return {
		restrict: 'E', // Directive which is declared as an attribute
		templateUrl: 'angularjsapp/src/app/components/user-badge/user-badge.tpl.html',
		replace: true,
		scope: {
			role: '@',
			level: '@',
			subscriptionType: '@',
			channelId: '@',
			// broadcast: '@'
		},
		link: function(scope, element, attributes) {
			scope.broadcast = angular.copy(broadcasterService, {});
			scope.config = angular.copy(config, {});
		}
	};
}])

//bi directional
.directive('userBadgeDynamic', ["broadcasterService", "config", function(broadcasterService, config) {
	return {
		restrict: 'E', // Directive which is declared as an attribute
		templateUrl: 'angularjsapp/src/app/components/user-badge/user-badge-dynamic.tpl.html',
		replace: true,
		scope: {
			role: '=',
			level: '=',
			subscriptionType: '=',
			channelId: '='
		},
		link: function(scope, element, attributes) {
			scope.broadcast = broadcasterService;
			scope.config = angular.copy(config, {});
		}
	};
}])


;
