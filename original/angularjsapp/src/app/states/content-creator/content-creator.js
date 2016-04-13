angular.module('younow.content-creator', ['ui.router'])

.config(["$stateProvider", function config($stateProvider) {

	$stateProvider.state('fullscreen', {
		url: '/getpartnered',
		templateUrl: 'angularjsapp/src/core/states/content-creator/content-creator.tpl.html',
		controller: 'ContentCreatorCtrl',
		controllerAs: 'vm'
	});

}])

.controller('ContentCreatorCtrl', function ContentCreatorCtrl(Api, config) {
	var vm = this;
	vm.configSettings = config.settings;
	vm.partnerInfo = {
		'email': '',
		'phone': '',
		'firstName': '',
		'lastName': '',
		'mcnId': '3326444'
	};
	vm.selectedTestimonial = "1";
	vm.success = null;
	vm.submittedForm = false;

	vm.submitPartnerInfo = function() {
		vm.submittedForm = true;
		var postRequest = Api.post('younow/mcnContentCreator', vm.partnerInfo);
		postRequest.then(function(response) {
			if (response.data.errorCode === 0) {
				vm.success = true;
			}
		});

	};


	vm.scrollToSignUp = function() {
		var el = document.getElementById('scroll-point');
		if (el) {
			el.scrollIntoView({
				block: "end",
				behavior: "smooth"
			});
		}
	};

});
