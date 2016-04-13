angular.module('younow.core.services')

.factory('TrackingPixelCore', function($state, $http, $window, ApiCore) {
	var TrackingPixelCore = {};
	var Api;
	var localVars = {
		//label map
		_paramsMap: {
			'host': 0,
			'event': 1,
			'dateday': 2,
			'userid': 3,
			'session': 4,
			'broadcastid': 5,
			'doorid': 6,
			'userlevel': 7,
			'broadcastscount': 8,
			'unspentcoins': 9,
			'usertype': 10,
			'extradata': 11,
			'coins': 12, //viewers
			'points': 13,
			'platform': 14,
			'sourceid': 15,
			'domain': 16,
			'field1': 17,
			'field2': 18,
			'field3': 19,
			'field4': 20,
			'field5': 21,
			'field6': 22,
			'field7': 23,
			'pixel': 24
		},
		//type map to check capture params
		_paramTypes: {
			'host': 'string',
			'event': 'string',
			'dateday': 'string',
			'userid': 'number',
			'session': 'string',
			'broadcastid': 'number',
			'doorid': 'number',
			'userlevel': 'number',
			'broadcastscount': 'number',
			'unspentcoins': 'number',
			'usertype': 'number',
			'extradata': 'string',
			'coins': 'number',
			'points': 'number',
			'platform': 'number',
			'sourceid': 'number',
			'domain': 'string',
			'field1': 'string',
			'field2': 'string',
			'field3': 'string',
			'field4': 'string',
			'field5': 'string',
			'field6': 'string',
			'field7': 'string',
			'pixel': 'string'
		},
		_localStorageDeviceId: 'trpx_device_id'
	};

	/**
	 * @ngdoc object
	 * @name TrackingPixelCore
	 * @description
	 *
	 * The TrackingPixelCore is part of a set of base services that our apps (mobile & desktop currently)
	 * consume to extend their own versions of the Api service.
	 *
	 */

	/**
	  * @ngdoc
	  * @name TrackingPixelCore.Base
	  * @methodOf TrackingPixelCore
	  * @param {object} options An object of options that can be passed into the app. They currently consist of the following:
	  * @param {object} paramsMap An optional object that overrides the default params map within the tracking pixel. (used for building the tracking pixel url)
	  * @param {object} paramTypes An optional object that overrides the default param types within the tracking pixel. (used for type checking)
	  * @param {object} config The app's config object.
	  * @description
	  *
	  * The Base method of the TrackingPixelCore is the standard way we initialize services. It returns an object which should then extend the functionality of the
	  * app's TrackingPixel (tracking) service.
	  *
	  * Keep in mind that a map of parameters and a map of param types has to be retrieved from the core's local variables
	  * in order for the TrackingPixelCore to be fully integrated into the app.
	  *
	  * @example
	   ```
	   	var trackingPixelCore = new TrackingPixelCore.Base({
		  config: config
	  	});
	  	var trackingPixel = angular.extend(trackingPixelCore, {});
	  	var paramsMap = trackingPixel._getLocalVar('paramsMap');
	  	var paramTypes = trackingPixel._getLocalVar('paramTypes');
	   ```
	 */

	TrackingPixelCore.Base = function(options) {
		"use strict";
		if (!(this instanceof TrackingPixelCore.Base)) {
			throw new Error("TrackingPixelCore.Base needs to be called with the new keyword");
		}
		//inject an instance of Api to use only in this tracking pixel core constructor
		Api = new ApiCore.Base(options.config);

		if (options.paramsMap && typeof options.paramsMap == 'object') {
			angular.extend(localVars._paramsMap, options.paramsMap);
		}
		if (options.paramTypes && typeof options.paramTypes == 'object') {
			angular.extend(localVars._paramTypes, options.paramTypes);
		}

		localVars._countSessions = Api.store('countSessions');
		if (Api.store(localVars._localStorageDeviceId) && (localVars._countSessions == null || localVars._countSessions[0])) {
			Api.store('countSessionsEnable', null);
			Api.store('countSessions', 0);
			Api.store('countSessionArrivals', 0);
		}

		//set up device id unless user has one in cache
		if (!Api.store(localVars._localStorageDeviceId)) {
			Api.store(localVars._localStorageDeviceId, generateTrackingId());
			Api.store('countSessionsEnable', 'true');
			Api.store('countSessions', 0);
			Api.store('countSessionArrivals', 0);
		}

		/**
		 * @ngdoc
		 * @name TrackingPixelCore.checkTrpxSession
		 * @methodOf TrackingPixelCore
		 * @param {object} paramsMap An optional object that overrides the default params map within the tracking pixel. (used for building the tracking pixel url)
		 * @description
		 *
		 * Increments or decrements the countSessions localStorage variable that we use to track the amount of sessions a user has had.
		 * It also creates a trpxId if there isn't one available or if it has expired.
		 *
		 */

		this.checkTrpxSession = function() {
			var lastTrpxSessionTime = Api.store('trpxTime'),
				currentTime = new Date().getTime();

			//no tracking pixel session found create one
			if (!lastTrpxSessionTime || Api.store('trpxId') === null) {
				incrementSession();
			} else

			//tracking pixel session has expired (30 mins diff), create a new one
			if (lastTrpxSessionTime && (currentTime - lastTrpxSessionTime > 1800000)) {
				incrementSession();
			}
		};

		// Setup session tracking
		this.checkTrpxSession();

		//exposed functions
		/**
		 * @ngdoc
		 * @name TrackingPixelCore.captureHelper
		 * @methodOf TrackingPixelCore
		 * @param {object} params A set of params that make up the tracking pixel url.
		 * @description
		 *
		 * A helper function that generates a tracking pixel url and sends a tracking pixel request based on a set of params passed in.
		 *
		 */
		this.captureHelper = function(params) {
			for (var param in params) {
				// fix
				if (localVars._paramTypes[param] == 'number' && !isNaN(params[param])) {
					params[param] = parseInt(params[param]) || 0;
				}
				// warn
				if (typeof params[param] !== localVars._paramTypes[param]) {
					console.warn('Warning: ' + param + ' should have a type of ' + localVars._paramTypes[param]);
				}
			}
			// send
			return $http.get(Api.buildPixelTracking(formatParams(params)));
		};

		/**
		 * @ngdoc
		 * @name TrackingPixelCore.trackArrivalHelper
		 * @methodOf TrackingPixelCore
		 * @param {object} track An object defining the params to be tracked when the user lands/arrives.
		 * @description
		 *
		 * A helper function that generates a tracking pixel url and sends a tracking pixel request based on a set of params passed in when the user lands.
		 * Note that it generates and finds a linkType, referrer, linkTerm and a referrerPath.
		 *
		 */
		this.trackArrivalHelper = function(track) {
			//  Open type (1 = manual, 2 = link, 3 = push)(always 2 for now)
			if(!track.broadcastscount) {
				track.broadcastscount = 2;
			}

			track.field3 = Api.getLinkType(window.location.pathname, window.location.search); // linkType
			track.field6 = Api.getReferrer(); // referrer
			var linkTerm = Api.getLinkTerm(window.location.pathname, window.location.search, track.field3); // linkTerm
			var referralPath = Api.getReferrerPath(); // path
			if (linkTerm) {
				track.field2 = linkTerm;
			}
			if (referralPath) {
				track.field7 = referralPath;
			}
			if(!track.field5) { track.field5 = ''; } // don't want defaults used for arrival event
			if(!track.field6) { track.field6 = ''; } // don't want defaults used for arrival event

			// go
			return this.capture(track);
		};

		/**
		 * @ngdoc
		 * @name TrackingPixelCore.trackClick
		 * @methodOf TrackingPixelCore
		 * @param {string} action The event label to be sent to redshift (as a parameter in the tracking pixel url).
		 * @param {object} params An object defining the params to be tracked.
		 * @description
		 *
		 * A helper function that generates a tracking pixel url and sends a tracking pixel request based on a set of params passed in when the user lands.
		 * Note that it generates and finds a linkType, referrer, linkTerm and a referrerPath.
		 *
		 */
		this.trackClick = function(action, params) {
			var track = {
				event: 'CLICK',
				extradata: action,
				points: Api.store('countSessionsEnable') ? Api.store('countSessions') || 0 : 0
			};
			track = angular.extend(track, params);
			return this.capture(track);
		};

		/**
		 * @ngdoc
		 * @name TrackingPixelCore.trackClick
		 * @methodOf TrackingPixelCore
		 * @param {string} varName The local variable to return.
		 * @returns {object} Two of the possible local variables are objects but this can also return a string or any other local variables from within the core.
		 * @description
		 *
		 * Return a local variable from within the core constructor. Recommended use is to initialize the local variables for the apps custom trackingPixel service.
		 * Currently the local variables are defined below:
		 *
		 * _paramsMap :  a list of param labels and their corresponding position in the tracking pixel url.
		 * _paramTypes : a list of param labels and their corresponding types (string, number, boolean).
		 * _localStorageDeviceId : the device id stored in the browser's localStorage.
		 *
		 *
		 * This should be used sparingly as we want to reduce the amount of references we make to the core constructor.
		 */
		this._getLocalVar = function(varName) {
			return localVars['_' + varName];
		};
	};

	//********************** Private functions *************************************//
	// can be exposed if needed
	function generateTrackingId() {
		var text = "",
			possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

		for (var i = 0; i < 10; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}

		return text;
	}

	function incrementSession() {
		Api.store('trpxId', generateTrackingId());
		if (Api.store('countSessionsEnable')) {
			Api.store('countSessions', Api.store('countSessions') + 1);
		}
		Api.store('countSessionArrivals', 0);
		Api.store('trpxTime', new Date().getTime());
	}

	function formatParams(params) {
		var result = {};
		for (var param in params) {
			result[localVars._paramsMap[param]] = params[param];
		}
		return result;
	}

	return TrackingPixelCore;
})

;
