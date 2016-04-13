angular.module('younow.services.selfies', [])

.factory('selfies', function($interval, $timeout, config, Api, upload) {

	var selfies = {
		currentSelfie: undefined,
		queue: undefined,
		selfieReady: false,
		selfieImage: undefined,
		localSelfieSrc: {}
	};

	var user = {},
		selfiesQueue = [],
		preloadedCanvas = document.createElement('canvas'),
		guestEvents = ['onGuestConnecting', 'onGuestConnected', 'onGuestBroadcasting', 'onGuestInvite', 'onGuestDirectInvite'];

	preloadedCanvas.width = 592;
	preloadedCanvas.height = 444;

	window.preloadedCanvas = preloadedCanvas;

	selfies.loadSelfie = function(data, channelId) {
		clearSelfies(selfies.currentSelfie ? true : false);
		selfies.selfieImage = new window.Image();
		selfies.selfieImage.crossOrigin = "anonymous";
		selfies.selfieImage.onload = function() {
			selfies.currentSelfie = new Selfie(data.userId, data.sfb, data.name, selfies.selfieImage);
			var canvas = document.getElementById("bcCanvas");
			preloadedCanvas.getContext("2d").drawImage(selfies.selfieImage, 0, 0, selfies.selfieImage.naturalWidth, selfies.selfieImage.naturalHeight, canvas.width / 2, 0, 444, 444);
			selfies.selfieReady = true;
			canvas.getContext("2d").drawImage(preloadedCanvas, 0, 0);
			selfies.currentSelfie.gif.load();

			if (selfies.selfieDelayedAnnounce) {
				$timeout.cancel(selfies.selfieDelayedAnnounce);
			}

			selfies.selfieDelayedAnnounce = $timeout(function() {
				selfies.announceSelfie(channelId, channelId, data.userId, data.sfb);
			}, config.settings.SelfiePusherDelay);
		};
		selfies.selfieImage.src = config.settings.SelfieBaseUrl + data.sfb;
	};

	selfies.clearSelfies = function(channelId, userId) {
		clearSelfies();
		selfiesQueue = [];
		if (channelId && userId) {
			Api.post('selfie/clear', {
				channelId: channelId,
				userId: userId
			});
		}
	};

	selfies.nextSelfie = function(channelId) {
		//shift the first one if the queue exists so we can get a new one
		if (selfiesQueue.length > 0) {
			selfiesQueue.shift();
		}
		//request more if we're getting low
		if (selfiesQueue.length === 0 || selfiesQueue.length === 5) {
			Api.get('selfie/queue', {
				channelId: channelId
			}).then(function(response) {
				if (response.data && response.data.list.length > 0) {
					selfies.emptyQueue = false;
					if (selfiesQueue.length === 0) {
						selfiesQueue = findDuplicate(response.data.list, selfies.selfieImage.src);
					} else {
						selfiesQueue = selfiesQueue.concat(response.data.list);
					}
					if (selfiesQueue.length > 0) {
						selfies.loadSelfie({
							userId: selfiesQueue[0].userId,
							sfb: selfiesQueue[0].sfb,
							name: selfiesQueue[0].name
						}, user.userId);
					} else {
						selfies.emptyQueue = true;
					}
				} else if (response.data && response.data.list.length === 0) {
					selfies.emptyQueue = true;
				}
			});
		} else {
			selfies.loadSelfie({
				userId: selfiesQueue[0].userId,
				sfb: selfiesQueue[0].sfb,
				name: selfiesQueue[0].name
			}, user.userId);
		}
	};

	selfies.announceSelfie = function(channelId, userId, selfieUserId, selfiePath) {
		Api.post('selfie/announce', {
			channelId: channelId,
			userId: userId,
			selfieUserId: selfieUserId,
			selfiePath: selfiePath
		});
	};

	selfies.onPusherEvent = function(eventName, eventData, extraData) {
		var data = (eventData && eventData.message) ? eventData.message : null;
		var selfie = data.selfie ? data.selfie : undefined;
		extraData = extraData === undefined ? {} : extraData;
		if (extraData.settingup) {
			return false;
		}

		//events for anyone but the broadcaster
		if (data.channelId != user.userId) {
			if (selfie) {
				if (data && eventName === 'onSelfieAnnounce') {
					selfies.newSelfie(selfie);
				} else if (eventName === 'onBroadcastPlayData' && (!selfies.currentSelfie || selfies.currentSelfie.userId != selfie.userId)) {
					selfies.newSelfie(selfie);
				}
			}
			if (eventName === 'onSelfieClear') {
				clearSelfies();
			}
		}

		//events for everyone, including broadcaster
		if (eventName === 'onBroadcastEnd' || guestEvents.indexOf(eventName) !== -1) {
			clearSelfies();
			selfiesQueue = [];
		}
	};

	selfies.newBroadcaster = function(data) {
		if (data.sf) {
			selfies.localSelfieSrc.sf = config.settings.SelfieBaseUrl + data.sf;
			selfies.localSelfieSrc.sfb = config.settings.SelfieBaseUrl + data.sfb;
		} else if (data.sf && selfies.localSelfieSrc.sf) {
			selfies.localSelfieSrc.preview = "//:0";
			selfies.localSelfieSrc.sf = "//:0";
			selfies.localSelfieSrc.sfb = "//:0";
		}
	};

	selfies.notifyLogin = function(data) {
		user.userId = data.userId;
	};

	selfies.notifyLogout = function() {
		user = {};
	};

	//used to expose the selfie constructor, currently does not take a gif. If required can do so.
	selfies.newSelfie = function(selfie) {
		selfies.currentSelfie = new Selfie(selfie.userId, selfie.selfiePath, selfie.name, undefined, selfie.level, selfie.city, selfie.state, selfie.country);
	};

	selfies.uploadSelfie = function(channelId, requestBy) {
		var apiData = {
			url: window.location.protocol + '//' + config.host + '/php/api/selfie/upload',
			method: 'POST',
			headers: {
				'X-Requested-By': requestBy
			},
			data: {
				channelId: channelId,
				userId: user.userId,
				selfie: Api.base64ToFile(selfies.localSelfieSrc.sf),
				selfie_big: Api.base64ToFile(selfies.localSelfieSrc.sfb),
				persist: 1,
				tsi: Api.store('trpxId'),
				tdi: Api.store('trpx_device_id')
			}
		};
		upload(apiData);
	};

	function Selfie(userId, selfiePath, name, gif, level, city, state, country) {
		this.userId = userId;
		this.selfiePath = selfiePath;
		this.name = name;
		this.level = level;
		this.city = city;
		this.state = state;
		this.country = country;
		if (gif) {
			this.gif = new window.SuperGif.decoder({
				gif: gif,
				canvas: document.getElementById("bcCanvas"),
				drawImageWith: {
					sx: 74,
					sy: 0,
					swidth: selfies.selfieImage.width,
					sheight: selfies.selfieImage.height,
					x: document.getElementById("bcCanvas").width / 2,
					y: 0,
					width: 444,
					height: 444
				}
			});
		} else {
			selfies.selfieReady = true;
		}
	}

	function clearSelfies(isReady) {
		if (selfies.currentSelfie && selfies.currentSelfie.gif) {
			selfies.currentSelfie.gif.pause();
		}
		if (selfies.selfieImage) {
			selfies.selfieImage.onload = undefined;
		}
		selfies.selfieImage = undefined;
		selfies.currentSelfie = undefined;
		selfies.selfieReady = isReady;
		selfies.attempted = undefined;
		selfies.emptyQueue = undefined;
	}

	function findDuplicate(selfies, selfieUrl) {
		var i = 0;
		for (i; i < selfies.length; i++) {
			if (selfieUrl.indexOf(selfies[i].sfb) !== -1) {
				selfies.splice(i, 1);
			}
		}
		return selfies;
	}

	return selfies;
})

;
