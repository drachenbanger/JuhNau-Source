angular.module('younow.services.webpush', [])

.factory('webpush', function($window, config, Api, session, trackingPixel, ab) {

	var webpush = {};

	webpush.triggerPushPrompt = function(source) {
		// Only if participating device
		if(webpush.variant && webpush.variant==='B') {
			// Only if not already enabled
			window.OneSignal.push(["isPushNotificationsEnabled", function(enabled) {
				if(!enabled) {
					// Only if not shown within 48 hours
					if (!Api.store('pp_shown_last') || Api.store('pp_shown_last') + (1000 *60*60 *72) < Date.now()) {
						window.OneSignal.push(["registerForPushNotifications", {modalPrompt: false}]);
						config.pushPrompt = source;
						Api.store('pp_shown_count', (Api.store('pp_shown_count')*1)+1);
						Api.store('pp_shown_last', Date.now());
						var trackevent = {
							'event': 'WEBPUSH_PROMPT',
							'extradata': source,
							'broadcastscount': Api.store('pp_shown_count'),
							'field1': trackingPixel.getUserLocation(),
							'field3': Api.os.name.split(' ')[0],
							'field4': Api.browser.name.split(' ')[0],
							'field7': Api.store('oneSignalId')
						};
						trackingPixel.capture(trackevent);
					}
				}
			}]);
		}
	};

	// OneSignal Seutp
	ab.ready.then(function() {
		// Only show to participating devices
		webpush.variant = ab.variant('WEB_PUSH_AB');
		if(webpush.variant && webpush.variant==='B') {

			// App details should come from config
			window.OneSignal.push(["init", {
				path: "/",
				appId: config.settings.ONESIGNAL_APP_ID,
				safari_web_id: config.settings.ONESIGNAL_SAFARI_ID,
				autoRegister: false,
				welcomeNotification: { disable: true },
				persistNotification: false,
				webhooks: {'notification.displayed': config.settings.ServerLocalBaseUrl + '/api/pushTrackingHandler.php'}
			}]);
			config.pushPrompt = false;

			// Listen for permission changes
			window.addEventListener('onesignal.prompt.native.permissionchanged', function(event) {
			    // Both 'from' and 'to' are each one of the following values: 'default', 'granted', or 'denied'
			    var promptSource = config.pushPrompt ? config.pushPrompt : 'UNPROMPTED';
			   	console.log(promptSource+': '+event.detail.to);
					var trackevent = {
						'event': 'WEBPUSH_PERMISSION',
						'extradata': promptSource,
						'broadcastscount': Api.store('pp_shown_count'),
						'field1': event.detail.from,
						'field2': event.detail.to,
						'field3': Api.os.name.split(' ')[0],
						'field4': Api.browser.name.split(' ')[0],
						'field7': Api.store('oneSignalId')
					};
					trackingPixel.capture(trackevent);
					config.pushPrompt = false;
			});

			// Listen for new subscription
			window.OneSignal.push(["getIdsAvailable", function(ids) {
				if (!Api.store('oneSignalId') || ids.userId != Api.store('oneSignalId')) {
					// Save user id in local storage
					Api.store('oneSignalId', ids.userId);
					Api.store('gcmlId', ids.registrationId);
					// Send to backend
					var post = {
						"deviceType": Api.browser.name,
						"deviceChannel": ids.userId
					};
					if (session.user && session.user.userId) {
						post.userId = session.user.userId;
					}
					Api.post('younow/deviceChannel', post);
				}
			}]);

			// Trigger initial prompt if new
			if (!Api.store('pp_shown_last')) {
				webpush.triggerPushPrompt('INITIAL');
			}

		}

	});

	return webpush;

})

;
