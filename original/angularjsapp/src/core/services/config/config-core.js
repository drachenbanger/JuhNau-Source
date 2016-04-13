(function() {
	angular.module('younow.core.services')

	.factory('ConfigCore', function($location) {
		var ConfigCore = {};

		ConfigCore.Base = function() {
			this.params = $location.search();
			this.settings = formatConfig(window.bootstrapConfig);
			this.host = this.params.host || window.location.host;
			this.buybarsiframe = false; //TURNS ON THE IFRAME BUYBARS MODAL
			this.newVisitor = window.newVisitor = !window.localStorage.trpx_device_id ? true : false;
			this.bootstrap = {
				adminRoles: [1, 2, 3, 4, 5],
				cdnDev: "cdnv2-vd.younow.com",
				cdnProduction: "cdn2.younow.com",
				facebookAppId: 171373592926306,
				flashVersion: "47.35",
				googleClientId: "619368150599-2ef6s6o5dqgv6oqoq5tevtqo1k7gni12.apps.googleusercontent.com",
				googleAnalyticsId: "UA-24148895-1",
				jwplayerKey: "gyoz1D2yoy+GG57wtwrgni10vNZ0+43mBkBYhw==",
				TM_DOMAIN: "images1.younow.com",
				TM_ID: "7jnw4jh4"
			};
		};

		function formatConfig(data) {
			if (window.location.protocol === 'https:' && data.ServerCDNBaseUrl.indexOf('https') === -1) {
				data.ServerCDNBaseUrl = data.ServerCDNBaseUrl.replace("http", "https");
			}
			if (window.location.protocol === 'https:' && data.ServerLocalBaseUrl.indexOf('https') === -1) {
				data.ServerLocalBaseUrl = data.ServerLocalBaseUrl.replace("http", "https");
			}
			if (window.location.protocol === 'https:' && data.ServerRecommendationsBaseUrl.indexOf('https') === -1) {
				data.ServerRecommendationsBaseUrl = data.ServerRecommendationsBaseUrl.replace("http", "https");
			}
			if (window.location.protocol === 'https:' && data.TrackingHost.indexOf('https') === -1) {
				data.TrackingHost = data.TrackingHost.replace("http", "https");
			}
			if (window.location.protocol === 'https:' && data.PlayDataBaseUrl.indexOf('https') === -1) {
				data.PlayDataBaseUrl = data.PlayDataBaseUrl.replace("http", "https");
			}
			if (window.location.protocol === 'https:' && data.ServerHomeBaseUrl.indexOf('https') === -1) {
				data.ServerHomeBaseUrl = data.ServerHomeBaseUrl.replace("http", "https");
			}
			if (window.location.protocol === 'https:' && data.BadgeBaseUrl.indexOf('https') === -1) {
				data.BadgeBaseUrl = data.BadgeBaseUrl.replace("http", "https");
			}
			return data;
		}

		return ConfigCore;

	});

})();
