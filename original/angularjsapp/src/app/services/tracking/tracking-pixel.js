//This is a deprecated system. We will slowly begin to move to trpx for all tracking concerns.
//Please consult with Pedro before adding or using this factory

angular.module('younow.services.tracking-pixel', [])

.factory('trackingPixel', ["$interval", "$state", "$http", "$timeout", "config", "Api", "broadcasterService", "session", "swf", "debug", "$stateParams", "eventbus", "guestService", "TrackingPixelCore", function($interval, $state, $http, $timeout, config, Api, broadcasterService, session, swf, debug, $stateParams, eventbus, guestService, TrackingPixelCore) {
	var trackingPixelCore = new TrackingPixelCore.Base({
		config: config
	});
	var trackingPixel = angular.extend(trackingPixelCore, {});
	var paramsMap = trackingPixel._getLocalVar('paramsMap');
	var paramTypes = trackingPixel._getLocalVar('paramTypes');

	trackingPixel.startPinging = function() {
		config.init.then(function() {
			$timeout(function() {
				trackingPixel.checkTrpxSession();
				initPing();
			}, 1000);
			Api.poll(initPing, 'pingPoll', config.settings.PingInterval);
		});
	};

	window.document.addEventListener('loadTime', function(e) {
		var post = {
			'event': 'APP_LOAD_WEB',
			'broadcastscount': (window.YouNow.loadingTime.younowConfig || 0),
			'unspentcoins': (window.YouNow.loadingTime.younowUser || 0),
			'coins': (window.YouNow.loadingTime.younowReady || 0),
			'points': (Date.now() - window.YouNow.loadingTime.startTime),
			'field1': trackingPixel.getUserLocation(),
			'field3': Api.os.name.split(' ')[0],//+' '+Api.os.version.substr(0, Api.os.version.indexOf('.')),
			'field4': Api.browser.name.split(' ')[0]//+' '+Api.browser.version.substr(0, Api.browser.version.indexOf('.'))
		};
		if(window.swfobject && window.swfobject.getFlashPlayerVersion()) {
			post.field2 = window.swfobject.getFlashPlayerVersion().major;
		}
		trackingPixel.capture(post);
	}, false);

	trackingPixel.getUserLocation = function() {
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
		if (swf.settingUpBroadcast && isNotOnMainRoute()) {
			location = 'BRDCST_SETUP';
		}
		if (session.user && session.isBroadcasting && !swf.settingUpBroadcast && isNotOnMainRoute()) {
			location = 'LIVE';
		}
		if (swf.broadcast && (!session.user || (session.user && !session.isBroadcasting)) && !swf.settingUpBroadcast && isNotOnMainRoute()) {
			if (guestService.guest && guestService.guest.userId == session.user.userId) {
				location = 'GUESTBRDCST';
			} else {
				location = 'BRDCST';
			}
		}
		if (broadcasterService.async && isNotOnMainRoute()) {
			if (trackingPixel.archiveActive) {
				location = 'ARCHIVE';
			} else {
				location = 'PROFILE';
			}
		}

		return location || 'page_not_ready';
	};

	trackingPixel.capture = function(params) {
		if (window.isPrerender) {
			return false;
		}
		//get location of user on the app
		var location = trackingPixel.getUserLocation();
		var viewers = '';
		//setup defaults
		var defaultParams = {
			'host': config.settings.TrackingHost,
			'session': Api.store('trpxId'),
			'platform': 3,
			'domain': Api.store('trpx_device_id'),
			'pixel': config.settings.TrackingPxl,
			'sourceid': 0,
			'field5': config.settings.JS_VERSION,
			'field6': config.UILanguage
		};

		if ((location === 'EXPLORE' || location === 'TAG') && broadcasterService.exploreBroadcaster) {
			defaultParams.broadcastid = broadcasterService.exploreBroadcaster.broadcastId;
			defaultParams.doorid = broadcasterService.exploreBroadcaster.user ? broadcasterService.exploreBroadcaster.user.userId : 0;
			viewers = broadcasterService.exploreBroadcaster.viewers || '';
		}
		if (broadcasterService.broadcaster && broadcasterService.broadcaster.user && broadcasterService.broadcaster.broadcastId && isNotOnMainRoute() && !swf.settingUpBroadcast) {
			defaultParams.broadcastid = broadcasterService.broadcaster.broadcastId;
			defaultParams.doorid = broadcasterService.broadcaster.user.userId;
			viewers = broadcasterService.broadcaster.viewers || '';
		}
		if (viewers) {
			if (!viewers.replace) {
				defaultParams.coins = viewers.toString();
			} else {
				defaultParams.coins = viewers.replace(',', '');
			}
		}

		//special rule if there if profile page but not live
		if ((broadcasterService.broadcaster && broadcasterService.broadcaster.userId) && location === 'PROFILE' && !params[6]) {
            defaultParams.doorid = broadcasterService.broadcaster.userId;
        }

		//with user
		if (session.user && session.user.userId > 0) {
			defaultParams.userid = session.user.userId;
			defaultParams.userlevel = session.user.level;
			defaultParams.broadcastscount = session.user.broadcastsCount;

			if (!isNaN(Number(session.user.userCoins))) {
				defaultParams.unspentcoins = Math.round(Number(session.user.userCoins));
			}

			if (broadcasterService.broadcaster && broadcasterService.broadcaster.userId) {
				defaultParams.usertype = broadcasterService.broadcaster.userId === session.user.userId ? 2 : 1;
			}
		} else {
			defaultParams.userid = 0;
		}

		params = angular.extend(defaultParams, params);
		trackingPixel.captureHelper(params);

		debug.console(['TRPX', params.event], params);
	};

	function isNotOnMainRoute() {
		return $state.current.name !== 'main.settings' && $state.current.name !== 'home' && $state.current.name !== 'about' && $state.current.name !== 'policy' && $state.current.name !== 'main.explore' && $state.current.name !== 'lockout' && $state.current.name !== '/jobs' && $state.current.name !== 'info' && $state.current.name !== '/partners' && $state.current.name !== '/partners/earnings';
	}

	function initPing() {
		var pingData = buildPingData();

		//if page was hidden before we should replace the old time with this new time to track the inactivity
		if (Api.isPageHidden() && !trackingPixel.pageWasHidden) {
			trackingPixel.pageWasHidden = true;
		}

		if (Api.isPageHidden()) {
			trackingPixel.capture(pingData);
		}

		if (!Api.isPageHidden()) {
			//if page was hidden before then we should check the session
			if (trackingPixel.pageWasHidden) {
				trackingPixel.pageWasHidden = false;
			}

			//time since last tracking ping
			Api.store('trpxTime', new Date().getTime());
			trackingPixel.capture(pingData);
		}

		// arrivals / sessions
		// enable
		if (!Api.store('hideYounowLanding')) {
			Api.store('countSessionsEnable', 'true');
		}
		// init
		var locate = trackingPixel.location || trackingPixel.getUserLocation();
		if (
			((locate === 'EXPLORE' || locate === 'TAG') && (!broadcasterService.exploreBroadcaster || !broadcasterService.exploreBroadcaster.user)) ||
			((locate === 'BRDCST') && (!broadcasterService.broadcaster || !broadcasterService.broadcaster.user))
		) {
			// on next ping
			if (trackingPixel.arrivalTrackingFirstAttempted) {
				trackingPixel.trackArrival();
			}
			trackingPixel.arrivalTrackingFirstAttempted = true;
		} else {
			// on first ping
			trackingPixel.trackArrival();
		}
	}

	// VIEWTIME
	trackingPixel.bcViewtime = function(name, params) {
		var bc = broadcasterService.getBc();
		if (broadcasterService.viewtimeSeconds && bc && bc.broadcastId) {
			// set
			var track = {
				event: 'VIEWTIME'
			};
			track.points = broadcasterService.viewtimeSeconds || 0;
			track.extradata = bc.channelSwitch;
			track.broadcastid = bc.broadcastId || 0;
			track.doorid = bc.user.userId || 0;
			track.field5 = bc.profile;
			// reset
			broadcasterService.viewtimeSeconds = 0;
			// go
			return trackingPixel.capture(track);
		}
	};
	// prepare
	broadcasterService.viewtimeSeconds = 0;
	broadcasterService.viewtimeInterval = $interval(function() {
		broadcasterService.viewtimeSeconds++;
	}, 1000);
	// init
	eventbus.subscribe('broadcaster:beforeChange', trackingPixel.bcViewtime, 'trackingPixel');
	eventbus.subscribe('trackingPixel:capture', remoteCapture, 'trackingPixel');

	trackingPixel.trackArrival = function() {
		// x duplicate
		if (trackingPixel.arrivalTracked) {
			return false;
		} else {
			trackingPixel.arrivalTracked = true;
		}
		// increment
		var countSessionArrivals = Api.store('countSessionArrivals');
		Api.store('countSessionArrivals', countSessionArrivals = countSessionArrivals + 1);
		// track
		var track = {
			event: 'ARRIVAL',
			points: Api.store('countSessionsEnable') ? Api.store('countSessions') || 0 : 0,
			coins: countSessionArrivals,
			field1: trackingPixel.getUserLocation()
		};

		if ($stateParams.srcId) {
			if (!isNaN($stateParams.srcId) && $stateParams.srcId<1100) {
				track.sourceid = parseInt($stateParams.srcId);
				if($stateParams.srcId>300 && $stateParams.srcId<400) {
					track.broadcastscount = 3;
				}
			} else {
				track.field5 = $stateParams.srcId;
			}
		}

		trackingPixel.trackArrivalHelper(track);
	};

	//when tab gets activated/focused, check if the trpx session has been timed out.
	window.onfocus = function() {
		trackingPixel.checkTrpxSession();
	};

	//builder to help us pass things to the ping event
	function buildPingData() {
		var pingData = {};
		pingData.extradata = trackingPixel.getUserLocation();

		//as a guest
		if (pingData.extradata === 'GUESTBRDCST') {
			if (swf.broadcast.chatMode == 1) {
				pingData.field1 = 'GUEST_SUB';
			} else {
				pingData.field1 = 'GUEST';
			}
		}

		//as a broadcaster or viewer
		if (pingData.extradata === 'LIVE' || pingData.extradata === 'BRDCST') {
			if (guestService.guest && swf.broadcast && !swf.broadcast.chatMode) {
				pingData.field1 = 'GUEST';
			} else if (!guestService.guest && swf.broadcast && swf.broadcast.chatMode == 1) {
				pingData.field1 = 'SUB';
			} else if (guestService.guest && swf.broadcast && swf.broadcast.chatMode == 1) {
				pingData.field1 = 'GUEST_SUB';
			} else {
				pingData.field1 = 'NORMAL';
			}
		}

		if (pingData.extradata === 'TAG' || pingData.extradata === 'SEARCH' || pingData.extradata === 'EXPLORE') {
			if (guestService.guest && broadcasterService.exploreBroadcaster && !broadcasterService.exploreBroadcaster.chatMode) {
				pingData.field1 = 'GUEST';
			} else if (!guestService.guest && broadcasterService.exploreBroadcaster && broadcasterService.exploreBroadcaster.chatMode == 1) {
				pingData.field1 = 'SUB';
			} else if (guestService.guest && broadcasterService.exploreBroadcaster && broadcasterService.exploreBroadcaster.chatMode == 1) {
				pingData.field1 = 'GUEST_SUB';
			} else {
				pingData.field1 = 'NORMAL';
			}
		}

		if (pingData.extradata === 'GUESTBRDCST' || pingData.extradata === 'LIVE' || pingData.extradata === 'TAG' || pingData.extradata === 'SEARCH' || pingData.extradata === 'EXPLORE' || pingData.extradata === 'BRDCST') {
			pingData.field6 = navigator.language || navigator.userLanguage || '';
			pingData.field7 = config.settings.JS_VERSION;
		}

		if (Api.isPageHidden()) {
			pingData.event = 'INACTIVE_PING';
		} else {
			pingData.event = 'PING';
		}

		return pingData;
	}

	function remoteCapture(event, args) {
		trackingPixel.capture(args);
	}

	return trackingPixel;
}])

;
