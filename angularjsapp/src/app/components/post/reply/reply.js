angular.module('younow.reply', [])

.directive('younowReply', function() {
	return {
		restrict: 'A', // Directive which is declared as an attribute
		replace: true, // Replace the element where the directive is declared
		templateUrl: 'angularjsapp/src/app/components/post/reply/reply.tpl.html',
		controller: 'YounowReplyCtrl'
	};
})

.controller('YounowReplyCtrl', ["$scope", function HomeController($scope) {

	// TODO: Combine replies & posts into a single controller
	// Skipped because angular didn't like recursive directives
	// For now, reply template is identical to post, with the reply loop removed 

	// Rename as post, and use the same setup / handling
	if ($scope.reply) {
		$scope.post = $scope.preparePost($scope.reply);
	}

}])

;
