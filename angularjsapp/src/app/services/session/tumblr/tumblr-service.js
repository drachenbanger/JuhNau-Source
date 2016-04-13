angular.module('younow.services.session.tumblr', [])

.factory('tumblr', ["$q", "$window", "$interval", "config", "Api", function($q, $window, $interval, config, Api) {

	var tumblr = {};

	tumblr.authenticate = function(silent) {
		var url = config.settings.ServerLocalBaseUrl + '/tumblrAuth.php';
		var loginWindow = window.open(url, 'Tumblr Login', 'location=0, status=0, width=650, height=350, scrollbars=1');
		
		var popupCheck = $interval(function() {
			try {
					if(!loginWindow.closed) {
						if(loginWindow.location.href.indexOf('tumblrId')!=-1) {

							// Success
							var data = Api.getJsonFromUrl(loginWindow.location.href.split("#")[0]);
							$interval.cancel(popupCheck);
							Api.returnDeferred(tumblr.deferred, 'resolve', data);
							loginWindow.close();

						} else {
							// Still choosing blog
						}
					} else {			
						// Closed before completion			
						$interval.cancel(popupCheck);
						Api.returnDeferred(tumblr.deferred, 'reject', {error: 'closed'});
					}
			}
			catch (e) {
				// Still authenticating with tumblr
			}
		}, 50);

		// Setup a promise for the auth
		tumblr.deferred = $q.defer();
		return tumblr.deferred.promise;
	};

	return tumblr;

}])

;