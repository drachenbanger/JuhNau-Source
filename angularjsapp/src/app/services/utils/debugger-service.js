angular.module('younow.services.debugger', [])

.factory('debug', ["config", function(config) {
	//AVAILABLE TAGS
	//GA: EVENT, (CATEGORY)
	//GA: PAGE
	//TRPX: PING
	//CHANNELSWITCH
	//SWF: BROADCAST, STATE, INVOKE

	var debug = {};
	var types = [];
	var devTypes = [];

	if (config.params.debug) {
		types = types.concat(config.params.debug.split(' '));
	}

	debug.enabled = false;

	// type is an array of tags that specify the type of the log
	debug.console = function(type, content) {
		if (debug.enabled && (isTypeFound(types, type) || types.indexOf('all') !== -1)) {
			console.trace();
			console.log(type, content);
		}
	};

	debug.enableFor = function(type) {
		if (!debug.enabled) {
			debug.enabled = true;
		}
		types.concat(type);
	};

	if (config.host.indexOf('-') !== -1) {
		types = types.concat(devTypes);
	}

	if (config.params.debug) {
		types = noDuplicates(types);
		debug.enabled = true;
		//have to console at least once to start tracking the line number
		debug.console(types, 'Init Debugger');
	}

	if (config.params.debug == 'false') {
		debug.enabled = false;
	}

	function noDuplicates(a) {
		return a.sort().filter(function(item, pos, ary) {
			return !pos || item != ary[pos - 1];
		});
	}

	function isTypeFound(types, type) {
		var i = 0;
		for (i; i < types.length; i++) {
			if (type.indexOf(types[i]) === -1) {
				return false;
			}
		}
		return true;
	}

	return debug;

}])

;
