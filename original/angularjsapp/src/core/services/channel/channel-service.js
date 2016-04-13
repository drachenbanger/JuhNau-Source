angular.module('younow.core.services.channel', [])

.factory('broadcasterServiceCore', function() {

	var service = {};

	service.Base = function() {
		this.channelFormat = function(data, data2) {
			if (!data) {
				return data;
			}
			if (data2) {
				data = angular.extend(data, data2); // not often used, and shouldn't except if really needed
			}
			if (data.user) {
				data = angular.extend(data, data.user); // these two are used interchangeably in our app, so this gets rid of possible bugs when using new scope for existing template
			}
			data.profile = data.profileUrlString = data.profile || data.profileUrlString; // these two are used interchangeably in our app, so this gets rid of possible bugs when using new scope for existing template
			if (data.length) {
				data.length = parseInt(data.length);
			}
			if (data.viewers) {
				data.viewers = parseInt(data.viewers);
			}
			if (data.likes) {
				data.likes = parseInt(data.likes);
			}
			if (data.shares) {
				data.shares = parseInt(data.shares);
			}

			if (data.latestSubscriptions && data.totalSubscriptions) {
				data.latestSubscriptionsPlus = (data.totalSubscriptions - data.latestSubscriptions.length) || 0;
			}

			if (data.disabledGoodies) {
				var disabledGoodies = angular.extend(data.disabledGoodies); // arrange by key
				data.disabledGoodies = {};
				for (var goo in disabledGoodies) {
					data.disabledGoodies[disabledGoodies[goo]] = true;
				}
			}

			if (data.subscribersCount) {
				data.subscribersCount = parseInt(data.subscribersCount); // integer from string
				if (data.subscribersCount > 0) { // string from integer
					data.subscribersString = data.subscribersCount + ' Subscriber' + (data.subscribersCount != 1 ? 's' : '');
				} else {
					data.subscribersString = '0 Subscribers';
				}
			}

			if (data.latestSubscriptions && Object.keys(data.latestSubscriptions).length > 3) {
				var latestSubscriptions = data.latestSubscriptions;
				var latestSubscriptionsAdd = 0;
				data.latestSubscriptions = {};
				var i = 0;
				for (var k in latestSubscriptions) {
					if (i < 5) {
						data.latestSubscriptions[k] = latestSubscriptions[k];
					} else {
						latestSubscriptionsAdd++;
					}
					i++;
				}
				data.latestSubscriptionsPlus = (data.latestSubscriptionsPlus || 0) + latestSubscriptionsAdd;
			}

			return data;
		};

	};

	return service;
})

;
