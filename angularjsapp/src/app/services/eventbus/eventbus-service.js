angular.module('younow.services.eventbus', [])

//This is the eventbus, here we prefix the event.name with : (e.g., event:message)
//The subscribe function unsubscribes as soon as the subscriber is destroyed
//Alternatively you can unsubscribe yourself using the provided function
//This is to prevent memory leaks

//LIST OF CURRENT CHANNELS THROUGHOUT THE APP
//swf:rest
//pusher:ban
//broadcast:end
//error:loggedout
//settings:invalid
//user:update

.service('eventbus', ['$rootScope', function($rootScope) {
	var eventbus = {};

	eventbus.subscribers = {};

	eventbus.notifySubscribers = function(eventChannel, data) {
		$rootScope.$emit(eventChannel, data);
	};

	eventbus.subscribe = function(eventChannel, callback, subscriber, scope) {
		var channel = subscriber + ':' + eventChannel;
		if (eventbus.subscribers[channel]) {
			eventbus.subscribers[channel]();
		}
		//setup cleanup phase if scope is available
		if (scope) {
			scope.$on('$destroy', function() {
				eventbus.unsubscribe(subscriber, eventChannel);
			});
		}
		//setup callback when function is executed
		eventbus.subscribers[channel] = $rootScope.$on(eventChannel, function(event, args) {
			callback(event.name, args);
			event.preventDefault();
		});
	};

	eventbus.unsubscribe = function(subscriber, eventChannel) {
		subscriber = subscriber + ':' + eventChannel;
		for (var key in eventbus.subscribers) {
			if (key == subscriber) {
				eventbus.subscribers[key]();
				delete eventbus.subscribers[key];
			}
		}
	};

	return eventbus;

}])

;
