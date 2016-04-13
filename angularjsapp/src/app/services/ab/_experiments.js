////////////////////////////////
// ORGANIZE NEW EXPERIMENTS INTO CONCISE BLOCKS
// surround each with comments and line breaks // git has a hard time merging this file
angular.module('younow.services.ab')
	.factory('experiments', [function() {
		return {};
	}])

//
// ALL EXPERIMENTS
//
.run(["experiments", function(experiments) {


	// Web Push
	experiments.WEB_PUSH_AB = {
		backendExperiment: true,
		na: 'A'
	};

	// PROFILE TABS
	experiments.WEB_PROFILE_TABS = {
		backendExperiment: true,
		na: 'A'
	};

	// PROFILE
	experiments.WEB_NAV = {
		backendExperiment: true,
		na: 'A'
	};


}])

//
// ALL CONTROLLERS
//
// .controller('HOME_COLLAGE', function($scope, ab, $rootScope, $timeout, $interval, session, Api, config, $state, broadcasterService, trackingPixel) {
// 	window.HOME_COLLAGE_variant = ab.variant('HOME_COLLAGE');
// })

;
