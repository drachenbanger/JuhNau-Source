angular.module('younow.services.external-streamer', [])

//the factory has all the business logic for controlling and setting up a third party stream
.factory('externalStreamer', ["swf", "$window", "$timeout", function(swf, $window, $timeout) {

	var externalStreamer = {
		settings: {
			active: false,
			streaming: false
		}
	};

	externalStreamer.setBroadcastInitResp = function(data) {
		externalStreamer.settings.streamUrl = 'rtmp://' + data.directStreaming.host + '/liveapp';
		externalStreamer.settings.streamKey = data.directStreaming.stream;
	};

	externalStreamer.setBroadcastAddResp = function(data) {
		//externalStreamer.settings.streamUrl = 'rtmp://' + data.media.host + '/' + data.media.app;
		//externalStreamer.settings.streamKey = data.media.stream;
		externalStreamer.settings.added = true;
	};

	externalStreamer.onPusherEvent = function(pusherEvent, pusherData) {
		if (pusherEvent === 'onBroadcastPlayData' && externalStreamer.settings.active && !swf.settingUpBroadcast) {
			console.log(swf, externalStreamer);
			externalStreamer.settings.active = false;
			externalStreamer.settings.streaming = true;
			externalStreamer.settings.streamKey = undefined;
			externalStreamer.settings.streamUrl = undefined;
		}
		if ((pusherEvent === 'onBroadcastEnd' || pusherEvent === 'onBroadcastDisconnect' || pusherEvent === 'onBroadcastCancel') && (externalStreamer.settings.streaming || externalStreamer.settings.active)) {
			externalStreamer.reset();
		}
	};

	externalStreamer.reset = function() {
		externalStreamer.settings.active = false;
		externalStreamer.settings.streamUrl = undefined;
		externalStreamer.settings.streamKey = undefined;
		externalStreamer.settings.streaming = false;
		externalStreamer.settings.added = false;
	};

	return externalStreamer;
}])

;
