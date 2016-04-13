// REQUIRES: window.YouNow.loadingTime = new Object();
window.YouNow.loadingTime.event = window.document.createEvent("Event");
window.YouNow.loadingTime.event.initEvent("loadTime",true,false);
window.YouNow.loadingTime.outstandingRequests = 0;

window.YouNow.loadingTime.request = function(params) {
	if (window.YouNow.loadingTime.timeout) {
		window.clearTimeout(window.YouNow.loadingTime.timeout);
	}
	window.YouNow.loadingTime.outstandingRequests++;
};

window.YouNow.loadingTime.response = function(params) {
	if (window.YouNow.loadingTime.timeout) {
		window.clearTimeout(window.YouNow.loadingTime.timeout);
	}
	window.YouNow.loadingTime.outstandingRequests--;
	window.YouNow.loadingTime.timeout = window.setTimeout(window.YouNow.loadingTime.track, 250); // wait a bit not just to simulate images download lag, but also to make 100% sure all logic is finished, younow/Config does not use this counter, because it doesnt use our Api, so I'm not 100% sure younow/config gets counted, but it definitely should because it was one of the very first requests and other requests depend on it
};

window.YouNow.loadingTime.track = function(params) {
	if (!window.YouNow.loadingTime.outstandingRequests) {
		// track
		window.document.dispatchEvent(window.YouNow.loadingTime.event);
		// kill
		window.YouNow.loadingTime.request = undefined;
		window.YouNow.loadingTime.response = undefined;
		window.YouNow.loadingTime.track = undefined;
	}
};