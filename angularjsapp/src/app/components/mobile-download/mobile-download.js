angular.module('younow.modals.mobile-download', [])

	.controller('mobileDownloadCtrl', ['$scope', 'config', 'data', '$translate', function($scope, config, data, $translate) { // keep camel-case
	var vm = this;
	vm.baseCDN = config.settings.ServerCDNBaseUrl;
	vm.telInputId = 'telInputModal';
	vm.data = data;

	$scope.vm = vm;
}])

;
