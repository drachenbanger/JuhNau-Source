angular.module('younow.channel.selfies-overlay', [])

.directive('selfiesOverlay', function(selfies, session, swf, $modal, $translate, Api, config) {
	return {
		restrict: 'E',
		templateUrl: 'angularjsapp/src/app/components/video-player/selfies-overlay.tpl.html',
		scope: {},
		link: function(scope, element, attributes) {
			$translate('selfies_unavailable', {
				value: '<a href="https://www.mozilla.org/en-US/firefox/new/" target="_blank">Firefox</a>'
			}).then(function(response) {
				scope.selfiesUnavailableTxt = Api.trustedHTML(response);
			});
			scope.closeSelfies = function() {
				selfies.clearSelfies(swf.broadcast.userId, session.user.userId);
			};
			scope.selfies = selfies;
			scope.session = session;
			scope.swf = swf;
			scope.config = config;
			scope.openProfile = function(event) {
				event.stopPropagation();
				if (selfies.currentSelfie) {
					$modal.profileSummary(selfies.currentSelfie.userId, {
						sf: selfies.currentSelfie.selfiePath,
						source: 'SELFIE'
					});
				}
			};

			scope.nextSelfie = function() {
				if (session.user.userId == swf.broadcast.userId && !selfies.emptyQueue && !selfies.attempted) {
					selfies.nextSelfie(swf.broadcast.userId);
				}
				if(selfies.emptyQueue) {
					selfies.emptyQueue = false;
				}
			};
		}
	};
})

;
