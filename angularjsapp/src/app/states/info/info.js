angular.module('younow.info', ['ui.router'])

.config(["$stateProvider", "$urlRouterProvider", function config($stateProvider, $urlRouterProvider) {

	$stateProvider
		.state('info', {
			url: '/info/:locale/:doc',
			resolve: {
				doc: function() {}
			},
			templateUrl: 'angularjsapp/src/app/states/info/info.tpl.html',
			controller: 'infoCtrl'
		})
		.state('/press', {
			url: '/press',
			resolve: {
				doc: function() {
					return 'press';
				}
			},
			templateUrl: 'angularjsapp/src/app/states/info/info.tpl.html',
			controller: 'infoCtrl'
		});
	$urlRouterProvider.when('/press/', ["$state", function($state) {
		$state.go('/press');
	}]);

}])

.controller('infoCtrl', function DocsController(doc, $scope, $http, $sce, $stateParams, $timeout, $document, config) {
	// set Temporary language from Url
	if (window.globalVars.pageLanguage) {
		config.setTempLanguage(window.globalVars.pageLanguage);
		window.globalVars.pageLanguage = null;
	}
	
	$scope.sections = [];
	$stateParams.locale = $stateParams.locale || 'en';
	$stateParams.doc = $stateParams.doc || doc;

	$http.get('https://api.github.com/repos/younow/younow.github.io/contents/info/' + $stateParams.locale + '/' + $stateParams.doc + '.md', {
		'headers': {
			'Accept': 'application/vnd.github.v3.html'
		}
	}).success(function(data) {
		// Fix linebreaks
		data = data.replace(/\n/gi, '  \n');
		console.log(data);
		// Attach doc to scope
		$scope.docContent = $sce.trustAsHtml(data);
		// Do everything else on the next digest, once HTML has rendered
		$timeout(function() {
			// Scan the meta & text
			var doc = angular.element(document.getElementById('doc-content'));
			var meta = doc.find("td");
			if (meta.length) {
				// Set the title
				$scope.docTitle = angular.element(meta[0]).text();
				// Format differently for Arabic
				if (angular.element(meta[2]).text() == 'ME') {
					$scope.rtl = true;
				}
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
		$document.scrollTopAnimated(y - 75, 1000);
	};

})

;
