angular.module('younow.policy', ['ui.router'])

.config(["$stateProvider", function config($stateProvider) {

	$stateProvider.state('policy', {
		url: '/policy/:locale/:doc',
		templateUrl: 'angularjsapp/src/app/states/policy/policy.tpl.html',
		controller: 'PolicyCtrl'
	});


}])

.controller('PolicyCtrl', function DocsController($scope, $http, $sce, $stateParams, $timeout, $document, config) {

	$scope.sections = [];
	
	$http.get('https://api.github.com/repos/younow/younow.github.io/contents/policy/' + $stateParams.locale + '/' + $stateParams.doc + '.md', {
		'headers': {
			'Accept': 'application/vnd.github.v3.html'
		}
	}).success(function(data) {
		// Attach doc to scope
		$scope.docContent = $sce.trustAsHtml(data);
		// Do everything else on the next digest, once HTML has rendered
		$timeout(function() {
			// Scan the meta & text
			var doc = angular.element(document.getElementById('docs'));
			var meta = doc.find("td");
			// Set the title
			$scope.docTitle = angular.element(meta[0]).text();
			// Format differently for Arabic
			if (angular.element(meta[2]).text() == 'ME') {
				$scope.rtl = true;
			}
			// Extract h2 links for the sidebar
			angular.forEach(doc.find("h2"), function(h2) {
				var elem = angular.element(h2);
				$scope.sections.push({
					'innerText': elem.text(),
					'offsetTop': elem[0].offsetTop
				});
			});
			// Show document
			$scope.ready = true;
		});
	});

	$scope.scrollTo = function(y) {
		$document.scrollTopAnimated(y, 1000);
	};

})

;
