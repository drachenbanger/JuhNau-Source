//This is a brand NEW implementation of tracking pixel & tracking pixel core. We will use this from now on to track certain events.
//Slowly we will move all of our events to use this system. Please consult before using this experimental framework...

angular.module('younow.services.trpx', [])

.factory('trpx', function(Api, $http, config, debug, $state) {
	var trpx = {
		captureGroups: {},
		trackingInfo: {}
	};

	var sharedTrpxData = {};

	trpx.captureGroup = function(paramsMap, size) {
		this.paramsMap = paramsMap;
		this.size = size;
	};

	trpx.capture = function(params, captureGroup) {
		//we need to fetch some data in case it isn't ready when we instantiated the service
		var location = getUserLocation();
		updateDefault('user_location', location);
		updateDefault('sessionid', Api.store('trpxId'));
		updateDefault('deviceid', Api.store('trpx_device_id'));
		updateDefault('sessioncount', Api.store('countSessionsEnable') ? Api.store('countSessions') || 0 : 0);
		var param;
		//support the old way of senidng parameters, in a hashmap format
		for (param in params) {
			if (!params[param].value) {
				params[param] = {
					value: params[param]
				};
			}
		}
		params = angular.merge({}, captureGroup.paramsMap, params);
		for (param in params) {
			if (params[param].value) {
				// type casting for numbers
				if (captureGroup.paramsMap[param].type == 'number' && !isNaN(params[param].value)) {
					params[param].value = parseInt(params[param].value) || 0;
				}
				// warning for non number params that don't have the correct type
				if (typeof params[param].value !== captureGroup.paramsMap[param].type) {
					console.warn('Warning: ' + param + ' should have a type of ' + captureGroup.paramsMap[param].type);
				}
				//encode the string to be compliant with HTTP
				if (typeof params[param].value === 'string') {
					params[param].value = encodeURIComponent(params[param].value).replace(/%/g, '_');
				}
			}
		}
		debug.console(['TRPXV2'], params);
		return $http.get(Api.buildPixelTracking(formatParams(params), captureGroup.size));
	};

	function formatParams(params) {
		var result = {},
			param;
		for (param in params) {
			result[params[param].pos] = params[param].value;
		}
		return result;
	}

	var defaults = {};
	var updateDefault = function(key, val) {
		for (var group in defaults[key]) {
			var field = defaults[key][group];
			trpx.trackingInfo[group][field].value = val;
		}
	};

	// Setup the different groups [fieldName, fieldType, defaultKey(optional)]
	var groups = {};
	groups.trackevents = [
		['host', 'string'],
		['event', 'string'],
		['dateday', 'string'],
		['userid', 'number', 'userid'],
		['session', 'string', 'sessionid'],
		['broadcastid', 'number', 'broadcastid'],
		['doorid', 'number', 'doorid'],
		['userlevel', 'number', 'level'],
		['broadcastscount', 'number'],
		['unspentcoins', 'number'],
		['usertype', 'number'],
		['extradata', 'string'],
		['coins', 'number'],
		['points', 'number', 'sessioncount'],
		['platform', 'number', 'platform'],
		['sourceid', 'number', 'sourceid'],
		['domain', 'string', 'deviceid'],
		['field1', 'string'],
		['field2', 'string'],
		['field3', 'string'],
		['field4', 'string'],
		['field5', 'string', 'jsversion'],
		['field6', 'string', 'language'],
		['field7', 'string'],
		['pixel', 'string', 'pixel']
	];

	groups.webrtc = [
		['timestamp', 'string'],
		['event', 'string'],
		['userid', 'string', 'userid'],
		['sessionid', 'string', 'sessionid'],
		['broadcastid', 'number', 'broadcastid'],
		['userlevel', 'number', 'level'],
		['deviceid', 'string', 'deviceid'],
		['os_device', 'string', 'os_device'],
		['osver_manufacturer', 'string', 'os_ver'],
		['browser_platform', 'string', 'browser_name'],
		['browserver_network', 'string', 'browser_ver'],
		['appversion', 'string', 'jsversion'],
		['incomingframerate', 'string'],
		['outgoingframerate', 'string'],
		['outgoingabr', 'string'],
		['outgoingvbr', 'string'],
		['incomingabr', 'string'],
		['incomingvbr', 'string'],
		['packetslost', 'string'],
		['packetssent', 'string'],
		['jitter', 'string'],
		['rtt', 'string'],
		['connectiontype', 'string'],
		['eventlabel', 'string'],
		['framewidthsent', 'string'],
		['frameheightsent', 'string'],
		['isguest', 'number'],
		['reserved1', 'string'],
		['reserved2', 'string'],
		['reserved3', 'string'],
		['pixel', 'string', 'pixel']
	];

	groups.searchevents = [
		['timestamp', 'string'],
		['event', 'string'],
		['app_location', 'string', 'user_location'],
		['userid', 'string', 'userid'],
		['platform', 'number', 'platform'],
		['deviceid', 'string', 'deviceid'],
		['locale', 'string', 'locale'],
		['language', 'string', 'language'],
		['query', 'string'],
		['click_field', 'string'],
		['click_index', 'string'],
		['result_set_size', 'number', 'result_set_size'],
		['pixel', 'string', 'pixel']
	];

	// Shennanigans to get into the form we need
	for (var i in groups) {
		var groupName = i;
		trpx.trackingInfo[groupName] = {};
		for (var field in groups[i]) {
			var fieldName = groups[i][field][0];
			var defaultKey = groups[i][field][2];
			// For fields that use defaults, add to a map
			if (defaultKey) {
				if (!defaults[defaultKey]) {
					defaults[defaultKey] = {};
				}
				defaults[defaultKey][groupName] = fieldName;
			}
			// Create the tracking pixel object
			trpx.trackingInfo[groupName][fieldName] = {
				value: undefined,
				type: groups[i][field][1],
				pos: field
			};
		}
		trpx.captureGroups[groupName] = new trpx.captureGroup(trpx.trackingInfo[groupName], groups[groupName].length - 1);

	}

	// Update Defaults
	updateDefault('platform', 3);
	updateDefault('sourceid', 0);
	updateDefault('sessionid', Api.store('trpxId'));
	updateDefault('deviceid', Api.store('trpx_device_id'));
	updateDefault('os_device', Api.os.name);
	updateDefault('os_ver', Api.os.version);
	updateDefault('browser_name', Api.browser.name);
	updateDefault('browser_ver', Api.browser.version);
	updateDefault('language', config.UILanguage); // This actually changes, should have dynamic function
	updateDefault('locale', config.UILocale);
	updateDefault('jsversion', config.settings.JS_VERSION);
	updateDefault('pixel', config.settings.TrackingPxl);
	updateDefault('result_set_size', 0);
	updateDefault('sourceid', 0);

	trpx.updateUser = function(data) {
		updateDefault('level', data.level);
		updateDefault('userid', data.userId);
	};

	trpx.updateBroadcast = function(data) {
		sharedTrpxData.broadcastid = data.broadcastId;
		updateDefault('doorid', data.userId);
		updateDefault('broadcastid', data.broadcastId);
	};

	trpx.updateLanguage = function(language) {
		updateDefault('language', config.UILanguage);
	};

	trpx.updateLocale = function(locale) {
		updateDefault('locale', locale);
	};

	function getUserLocation() {
		var location;
		if ($state.current.name === 'main.settings') {
			location = 'SETTINGS';
		}
		if ($state.current.name === 'home') {
			location = 'HOME';
		}
		if ($state.current.name === 'about') {
			location = 'ABOUT';
		}
		if ($state.current.name === 'policy') {
			location = 'POLICY';
		}
		if ($state.current.name === 'main.explore') {
			if ($state.params.tag && $state.params.tag.length > 0) {
				location = 'TAG';
			} else if ($state.params.q) {
				location = 'SEARCH';
			} else {
				location = 'EXPLORE';
			}
		}
		if ($state.current.name === 'lockout') {
			location = 'LOCKOUT';
		}
		if ($state.current.name === 'jobs' || $state.current.name === 'infojobs') {
			location = 'JOBS';
		}
		if ($state.current.name === 'info') {
			location = 'INFO';
		}
		if ($state.current.name === '/partners' || $state.current.name === '/partners/earnings') {
			location = 'PARTNERS';
		}
		if ($state.current.name === 'main.channel.detail') {
			if (sharedTrpxData.broadcastid) {
				location = 'BRDCST';
			} else {
				location = 'PROFILE';
			}
		}

		return location || 'UNAVAILABLE';
	}

	return trpx;
})

;
