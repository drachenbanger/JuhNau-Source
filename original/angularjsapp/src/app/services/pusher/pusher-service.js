angular.module('younow.services.pusher', [])

.factory('pusher', function($http, config, Api, $window, $q, swf, $rootScope, debug, eventbus, guestService, externalStreamer, webRtc, selfies, trpx) {

	var pusher = {};

	var pusherReady = $q.defer();
	pusher.ready = function() {
		return pusherReady.promise;
	};

	pusher.init = function() {
		var options = {
			authEndpoint: config.settings.ServerLocalBaseUrl + '/api/pusherAuthDedicated.php',
			cluster: 'younow'
		};
		pusher.SDK = new $window.Pusher(config.settings.PusherDedicatedAppKey, options);
		pusherReady.resolve();
	};

	pusher.subscribeToPrivate = function(userId) {

		// Subscribe
		pusher.subscribe('privateChannel', 'private-channel_' + userId);
		pusher.privateChannel.channel.bind_all(function(eventName, eventData) {

			var blockedEvents = [
				'pusher:subscription_succeeded',
				'pusher:member_removed',
				'pusher:member_added',
				'pusher:subscription_error',
				'channel_is_live',
				'delete_comment',
				'new_comment',
				'new_like',
				'pin_comment',
				'unlike_comment'
			];

			debug.console(['PRIVATE', 'PUSHER'], {
				eventName: eventName,
				eventData: eventData
			});

			// Pass to SWF
			if (blockedEvents.indexOf(eventName) === -1) {
				eventData.channelId = pusher.channelId;
				eventData.type = 'private';
				swf.onPusherEvent(eventName, eventData);
				guestService.onPusherEvent(eventName, eventData);
				webRtc.onPusherEvent(eventName, eventData);
			}

			// Notification count change
			if (eventName == 'onNotificationCountChange') {
				eventbus.notifySubscribers('user:onNotificationCountChange', 1);
			}

			// Bans/Suspensions
			if (eventName == 'onSuspend' || eventName == 'onBan') {
				eventbus.notifySubscribers('pusher:ban', eventData);
				pusher.onBan = eventData;
			}
			if (eventName == 'onUnSuspend' || eventName == 'onUnBan') {
				pusher.onBan = 0;
				eventbus.notifySubscribers('pusher:ban', 0);
			}

			if (eventName == 'onAccountUpdate') {
				$rootScope.$broadcast('onAccountUpdate', eventData);
			}

			// Animated updates
			if (eventName == 'onCoins') {
				$rootScope.$evalAsync(function() {
					pusher.onCoins = eventData.message;
				});
			}

			// Changed localization event
			if (eventName == 'onLocaleChange') {
				$rootScope.$evalAsync(function() {
					pusher.onLocale = eventData.message.locale;
				});
			}

			// Locale change
			if (eventName == 'onLocale') {
				$rootScope.$evalAsync(function(locale) {
					if (locale) {
						config.UILocale = locale;
						trpx.updateLocale(locale);
					}
				});
			}

		});


	};

	pusher.subscribeToChannel = function(channelId, channelSwitch, SECTOKEN) {

		// Save the new channel id
		pusher.channelId = channelId;

		// Unsubscribe from the Async channel
		pusher.unsubscribe('asyncChannel');
		// Subscribe to both channels
		debug.console(["CHANNELSWITCH"], {
			'public-on-channel': pusher.channelId,
			'shard': pusher.shard,
			'channel-to': channelSwitch
		});
		//set up true or false
		if (!config.settings.NoPusherOnChannelWeb) {
			pusher.subscribe('presenceChannel', 'public-on-channel_' + pusher.channelId + '_' + pusher.shard + '_web_' + SECTOKEN + '_' + channelSwitch);
		}
		pusher.subscribe('publicChannel', 'public-channel_' + pusher.channelId);

		// Subscribe to events on the main channel
		pusher.publicChannel.channel.bind_all(function(eventName, eventData) {

			var blockedEvents = [
				'pusher:subscription_succeeded',
				'pusher:member_removed',
				'pusher:member_added',
				'pusher:subscription_error',
				'channel_is_live',
				'delete_comment',
				'new_comment',
				'new_like',
				'pin_comment',
				'unlike_comment',
				'onBroadcastPlay',
				'onCoins'
			];

			if (blockedEvents.indexOf(eventName) === -1) {
				eventData.channelId = pusher.channelId;
				eventData.type = 'public';
				swf.onPusherEvent(eventName, eventData);
				guestService.onPusherEvent(eventName, eventData);
				externalStreamer.onPusherEvent(eventName, eventData);
				webRtc.onPusherEvent(eventName, eventData);
				selfies.onPusherEvent(eventName, eventData, {
					settingup: swf.settingUpBroadcast
				});
			}

			var loggedEvents = [
				'pusher:subscription_error'
			];

			if (loggedEvents.indexOf(eventName) > -1) {}

		});

	};

	pusher.subscribeToAsync = function(channelId, callback) {

		// Save the new channel id
		pusher.channelId = channelId;

		// Unsubscribe from broadcast channels
		pusher.unsubscribe('publicChannel');
		pusher.unsubscribe('presenceChannel');

		// Subscribe to async channel
		pusher.subscribe('asyncChannel', 'public-async-channel_' + pusher.channelId);
		pusher.asyncChannel.channel.bind_all(callback);

	};

	pusher.subscribe = function(name, id) {
		pusher.unsubscribe(name);
		pusher[name] = {
			id: id
		};

		pusher[name].channel = pusher.SDK.subscribe(id);
		debug.console(['PUSHER', 'SUBSCRIBE'], {
			name: name,
			id: id
		});

	};

	pusher.unsubscribe = function(name) {
		if (pusher[name]) {
			console.log(name);
			debug.console(['PUSHER', 'UNSUBSCRIBE'], {
				name: name,
				id: pusher[name].id
			});
			pusher.SDK.unsubscribe(pusher[name].id);
			delete pusher[name];
		}

	};

	pusher.reset = function(name) {
		if (pusher[name]) {
			pusher.subscribe(name, pusher[name].id);
		}
	};


	return pusher;

})

;
