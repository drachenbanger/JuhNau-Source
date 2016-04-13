angular.module('younow.services.webpush', [])

.factory('webpush', function($window, config, Api, session, trackingPixel, ab) {

	var webpush = {};

	webpush.triggerPushPrompt = function(source) {
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
	};

	// OneSignal Seutp
	config.init.then(function() {

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

		// Add listeners
		window.OneSignal.push(function() {
		
			// Listen for permission changes
			window.OneSignal.on('notificationPermissionChange', function(event) {
			    // Both 'from' and 'to' are each one of the following values: 'default', 'granted', or 'denied'
			    var promptSource = config.pushPrompt ? config.pushPrompt : 'UNPROMPTED';
				var trackevent = {
					'event': 'WEBPUSH_PERMISSION',
					'extradata': promptSource,
					'broadcastscount': Api.store('pp_shown_count'),
					'field1': event.from || '',
					'field2': event.to || '',
					'field3': Api.os.name.split(' ')[0],
					'field4': Api.browser.name.split(' ')[0],
					'field7': Api.store('oneSignalId') || ''
				};
				trackingPixel.capture(trackevent);
				config.pushPrompt = false;
			});

			// Listen for new subscription
			window.OneSignal.on('subscriptionChange', function (isSubscribed) {
				if(isSubscribed) {
					window.OneSignal.push(["getUserId", function(oneSignalId) {
						if (oneSignalId && !Api.store('oneSignalId') || oneSignalId != Api.store('oneSignalId')) {
							// Save user id in local storage
							Api.store('oneSignalId', oneSignalId);
							// Send to backend
							var post = {
								"deviceType": Api.browser.name,
								"deviceChannel": oneSignalId
							};
							if (session.user && session.user.userId) {
								post.userId = session.user.userId;
							}
							Api.post('younow/deviceChannel', post);
						}
					}]);
				}
			});

		});

		// Trigger initial prompt if new
		if (!Api.store('pp_shown_last')) {
			webpush.triggerPushPrompt('INITIAL');
		}

	});

	return webpush;

})

;
