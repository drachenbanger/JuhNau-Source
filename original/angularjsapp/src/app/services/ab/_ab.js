angular.module('younow.services.ab', [])

// ab
.factory('ab', function(config, Api, session, trackingPixel, experiments, AbCore, $q) {
	var defer = $q.defer();
	var ab = {
		ready: defer.promise,
		isReady: false
	};

	config.init.then(function() {
		var core = new AbCore.Base({
			app: 'desktop',
			app_version: config.settings.JS_VERSION,
			config: config,
			experiments: experiments,
			captureCallback: trackingPixel.capture,
			BEexperiments: session.user.experiments
		});
		angular.extend(ab, core);
		defer.resolve();
		ab.isReady = true;
		core = null;
	});

	return ab;

})

;
