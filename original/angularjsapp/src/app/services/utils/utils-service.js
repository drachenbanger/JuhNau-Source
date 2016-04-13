angular.module('younow.services.utils', [])

.provider('Api', function ApiProvider($urlRouterProvider) {
	this.reRouteHandler = function(from, to) {
		$urlRouterProvider.when(from, ["$match", "$stateParams", "$injector", "$state", function($match, $stateParams, $injector, $state) {
			$injector.get('config').init.then(function() {
				$state.go(to);
			});
		}]);
	};

	this.$get = ["$window", "$http", "$document", "$q", "$sce", "$timeout", "$interval", "$rootScope", "config", "$location", "$filter", "eventbus", "ApiCore", "$filter",

		function($window, $http, $document, $q, $sce, $timeout, $interval, $rootScope, config, $location, $filter, eventbus, ApiCore, $filter) {

			var apiCore = new ApiCore.Base(config);
			var Api = angular.extend(apiCore, {});

			//use this array to ignore certain errors and handle them manually
			var silentErrors = [6020, 6023, 6021, 603, 249, 206, 6013, 6103, 6032];

			Api.post = function(method, data, secured, customUrl) {
				var url;
				var headers;
				if (config.banningMsg && method !== 'younow/logout') {
					Api.showTopNotification('<div>' + config.banningMsg.msgString + '</div>' + '<a class="btn btn-confirm" target="_blank" href="' + config.banningMsg.supportBtn.btnAct_web + '">' + config.banningMsg.supportBtn.btnTxt_web + '</a>', 'now', true, undefined);
					var deferred = $q.defer();
					deferred.reject();
					return deferred.promise;
				}
				if (method === 'younow/logout') {
					config.banningMsg = undefined;
				}

				if (!data) {
					data = {};
				}

				data.tsi = Api.store('trpxId');
				data.tdi = Api.store('trpx_device_id');

				if (method.substr(0, 4) === 'http') {
					url = method;
				} else if (secured) {
					url = config.settings.ServerSecureLocalBaseUrl + '/php/api/' + method;
				} else {
					url = config.settings.ServerLocalBaseUrl + '/php/api/' + method;
				}

				if (customUrl) {
					url = customUrl;
				}

				if (Api.requestBy) {
					headers = {
						'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
						'X-Requested-By': Api.requestBy
					};
				} else {
					headers = {
						'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
					};
				}

				Api.addToStack(method, 'lastApiStack');

				if (window.YouNow.loadingTime && window.YouNow.loadingTime.response) {
					window.YouNow.loadingTime.request();
				}

				return $http({
					method: 'POST',
					//withCredentials:true,
					headers: headers,
					data: Api.serialize(data),
					url: url
				}).success(function(data) {
					if (window.YouNow.loadingTime && window.YouNow.loadingTime.response) {
						window.YouNow.loadingTime.response();
					}
					// Handle errors
					Api.showError(data);
				});
			};

			Api.algolia = function(query, restrict, limit, page) {
				if (!limit) {
					limit = 5;
				}
				if (!page) {
					page = 0;
				}
				var url = 'https://' + config.settings.PeopleSearchAppId + '.algolia.io/1/indexes/' + config.settings.PeopleSearchIndex + '/query';
				var data = {
					"params": "query=" + encodeURIComponent(query) + "&hitsPerPage=" + limit + "&page=" + page + "&attributesToHighlight=none"
				};
				if (restrict) {
					data.params += "&restrictSearchableAttributes=" + restrict;
				}
				return $http({
					method: 'POST',
					headers: {
						'X-Algolia-Application-Id': config.settings.PeopleSearchAppId,
						'X-Algolia-API-Key': config.settings.PeopleSearchApiKey,
						'X-Algolia-TagFilters': config.settings.PeopleSearchSecurityTags
					},
					data: data,
					url: url
				});
			};

			Api.inject = function(script, id) {

				// Wrap in a promise
				var scriptLoad = $q.defer();

				// Create a script element
				var tag = $document[0].createElement('script');
				tag.type = 'text/javascript';
				tag.async = true;
				tag.id = id;
				tag.src = script;

				// Inject into DOM
				document.head.appendChild(tag);

				// Monitor when it is ready
				tag.onreadystatechange = tag.onload = function() {
					scriptLoad.resolve();
				};

				return scriptLoad.promise;

			};

			Api.buildShareUrl = function(options) {
				var url = 'https://' + config.host + '/';
				if (options.profileUrlString) {
					url += options.profileUrlString + '/';
				} else {
					return url;
				}
				if (options.entityId) {
					url += options.entityId + '/';
				} else {
					return url;
				}
				if (options.inviteStr) {
					url += options.inviteStr + '/';
				} else {
					return url;
				}
				if (options.srcId) {
					url += options.srcId + '/';
				} else {
					return url;
				}
				if (options.entityType) {
					url += options.entityType + '/';
				} else {
					return url;
				}
				return url;
			};

			Api.buildShareCopy = function(options) {
				var type, placeholders;
				if (options.source == 'TWITTER') {
					type = options.broadcaster ? 'PromoteOwnTWTemplates' : 'PromoteOtherTWTemplates';
					placeholders = {
						'{broadcastLink}': '',
						'{twitterHandle}': options.name,
						'{broadcaster_facebookFirstName} ': ''
					};
				}
				if (options.source == 'FACEBOOK') {
					type = options.broadcaster ? 'PromoteOwnFBTemplates' : 'PromoteOtherFBTemplates';
					placeholders = {
						'{broadcaster_facebookFirstName}': options.name
					};
				}
				return randomizedShareCopy(type, placeholders, options.url);
			};

			var randomizedShareCopy = function(type, placeholders, url) {
				var template = config.settings[type][Math.floor(Math.random() * config.settings[type].length)];
				var copy;
				if (template === '') {
					copy = url;
				} else {
					copy = Api.replacePlaceholders(template, placeholders);
				}
				return copy;
			};

			Api.openPopup = function(name, url) {
				var opts = 'status=1' +
					',width=' + 550 +
					',height=' + 420 +
					',top=' + (($window.innerHeight - 420) / 2) +
					',left=' + (($window.innerWidth - 550) / 2);
				// Route via Younow, to prevent popup blockers!
				url = config.settings.ServerHomeBaseUrl + 'redirect.php?url=' + encodeURIComponent(url);
				$window.open(url, name, opts);
			};

			Api.openSharePopup = function(data) {
				if (data.source === 'FACEBOOK') {
					window.FB.ui({
						method: 'feed',
						link: data.url,
						name: data.copy
					}, data.callback);
				}
				if (data.source === 'TWITTER') {
					var url = 'https://twitter.com/intent/tweet?text=' + window.encodeURIComponent(data.copy.replace(/^\s+|\s+$/gm, '')) + '&url=' + window.encodeURIComponent(data.url);
					Api.openPopup('_blank', url); // TODO: Try using twitter widgets to prevent popup blocking
				}
			};

			var replaceAllInstances = function(find, replace, str) {
				if (str.replace) {
					return str.replace(new RegExp(find, 'g'), replace);
				} else {
					return '';
				}
			};

			Api.replacePlaceholders = function(text, placeholders) {
				angular.forEach(placeholders, function(replacement, placeholder) {
					text = replaceAllInstances(placeholder, replacement, text);
				});
				return text;
			};

			Api.replaceMentions = function(post) {
				if (post.mentioned) {
					var mentions = post.mentioned.split(',');
					var placeholders = {};
					angular.forEach(mentions, function(mention) {
						var pieces = mention.split(':');
						placeholders['@' + pieces[0]] = '<a href="profile/' + pieces[1] + '" class="mention">' + pieces[0] + '</a>';
					});
					post.post = Api.replacePlaceholders(post.post, placeholders);
				}
				return post;
			};

			Api.prepareDescription = function(text) {
				text = Api.linkify(text) || $filter('translate')('profile_no_description');
				return $sce.trustAsHtml(text);
			};

			$window.getConfig = function() {
				return $window.getService('config');
			};
			$window.getSession = function() {
				return $window.getService('session');
			};
			$window.getUtils = function() {
				return $window.getService('Api');
			};

			/***
			NOTIFICATIONS
			***/
			Api.showTopNotification = function(message, type, sticky, id, time) {
				// prepare
				if (!$rootScope.notifications) {
					$rootScope.notifications = {};
				}
				var notification = new Notification(type, message, id, sticky, time);

				// add
				$rootScope.notifications[notification.group] = notification;

				// remove
				if (!sticky) {
					$timeout(function() {
						$rootScope.notifications[notification.group].active = false;
					}, notification.time);
				}

			};

			Api.showTopBanner = function(title, message, cta, ctaLink, type, sticky, id, time) {
				// prepare
				if (!$rootScope.banners) {
					$rootScope.banners = {};
				}
				var banner = new Notification(type, message, id, sticky, time);

				//custom banner message
				if (cta && ctaLink) {
					banner.message = '<div class="alert-container"><div class="banner-icon"><i class="ynicon ynicon-bc-golive"></i></div><div class="banner-content bordered"><b>' + title + '</b><br/><span>' + message + '</span></div><a class="btn btn-confirm" ng-click="onboardingCTA()" href="' + ctaLink + '">' + cta + '</a></div>';
				} else {
					banner.message = '<div class="alert-container"><div class="banner-icon"><i class="ynicon ynicon-bc-golive"></i></div><div class="banner-content"><b>' + title + '</b><br/><span>' + message + '</span></div></div>';
				}

				// add
				$rootScope.banners[banner.group] = banner;

				// remove
				if (!sticky) {
					$timeout(function() {
						$rootScope.banners[banner.group].active = false;
					}, banner.time);
				}
			};

			Api.closeTopBanner = function(group) {
				$rootScope.banners[group].active = false;
			};

			Api.closeTopNotification = function(group) {
				$rootScope.notifications[group].active = false;
			};

			Api.showError = function(data) {
				if (data.errorCode && silentErrors.indexOf(data.errorCode) !== -1) {
					return false;
				}
				if (data.errorCode === 101) {
					eventbus.notifySubscribers('error:loggedout');
					data.errorMsg = "You have been logged out. Please log in again.";
				}
				if (data.errorCode && data.errorMsg) {
					Api.showTopNotification(data.errorMsg);
				}
			};

			//Sets the deferred resolution or rejection to wait for the next digest cycle
			Api.returnDeferred = function(deferred, action, response) {
				$timeout(function() {
					if (action === 'resolve') {
						deferred.resolve(response);
					}
					if (action === 'reject') {
						deferred.reject(response);
					}
				});
			};

			Api.convertEmoji = function(string) {
				if (string.$$unwrapTrustedValue) {
					string = string.$$unwrapTrustedValue(string);
				}
				if (typeof string === 'string' && window.twemoji) {
					return $sce.trustAsHtml(window.twemoji.parse(string));
				} else {
					return $sce.trustAsHtml(string);
				}
			};

			Api.replaceHash = function(string) {
				if (string) {
					if (string.$$unwrapTrustedValue) {
						string = string.$$unwrapTrustedValue(string);
					}
					string = string.replace(/(^#[^\W_][\w-]*)|(\s#[^\W_][\w-]*)/g, '<span class="yn-hash">$1 $2</span>');

					return $sce.trustAsHtml(string);
				}
			};

			Api.buildWufooUrl = function(baseUrl, params) {
				if (baseUrl && params) {
					var paramsUrl = [];

					for (var param in params) {
						paramsUrl.push(param + '=' + params[param]);
					}

					paramsUrl = baseUrl + 'def/' + paramsUrl.join('&');

					return paramsUrl;

				} else {
					return baseUrl;
				}
			};

			Api.sortObject = function(obj) {
				var keys = [];
				var sorted_obj = {};

				for (var key in obj) {
					if (obj.hasOwnProperty(key)) {
						keys.push(key);
					}
				}

				// sort keys
				keys.sort();

				// create new array based on Sorted Keys
				angular.forEach(keys, function(i, key) {
					sorted_obj[keys[key]] = obj[keys[key]];
				});

				return sorted_obj;
			};

			Api.ArrayToObject = function(array) {
				var newObject = {},
					i;
				for (i = 0; i < array.length; ++i) {
					newObject[i] = array[i];
				}
				return newObject;
			};

			Api.sortUsers = function(users) {
				return users.sort(function(a, b) {
					// If status is the same, sort by name
					if (a.status == b.status) {
						return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
					}
					// Otherwise sort by decreasing status
					else {
						return a.status < b.status ? 1 : -1;
					}
				});
			};

			Api.isPageHidden = function() {
				if (isHiddenSupported) {
					return document.hidden || document.msHidden || document.webkitHidden || document.mozHidden;
				} else {
					return true;
				}
			};

			Api.convertBitwise = function(num, maxPositions) {
				var binary = num.toString(2).split('').reverse(),
					booleanArray = [];

				for (var i = 0; i < maxPositions; i++) {
					booleanArray.push(binary[i] == 1 ? true : false);
				}

				return booleanArray;
			};

			Api.triggerTooltip = function(el, time) {
				if (!time) {
					time = 2000;
				}
				if (!el[0] || !el[0].outerHTML) {
					if (typeof el == 'string') {
						el = angular.element(document.getElementById(el));
					}
				}
				if (el[0] && el[0].outerHTML) {
					var tooltip = el;
					if (tooltip && tooltip.triggerHandler) {
						$timeout(function() {
							tooltip.triggerHandler('show');
						}, 0);
						$timeout(function() {
							tooltip.triggerHandler('hide');
						}, time);
					}
				} else {
					throw new Error('Api.triggerTooltip failed! First attribute must be DOM element or ID string.');
				}
			};

			Api.goMobile = function(platform, level, source, activity) {
				var userLevelGrouping;
				if (level !== 0) {
					if (level >= 1 && level <= 5) {
						userLevelGrouping = 'low';
					}
					if (level >= 6 && level <= 10) {
						userLevelGrouping = 'med';
					}
					if (level >= 11) {
						userLevelGrouping = 'high';
					}
				} else {
					userLevelGrouping = 'anon';
				}
				if (activity) {
					$rootScope.gaEvent('GOMOBILE', platform + source, userLevelGrouping, activity);
				} else {
					$rootScope.gaEvent('GOMOBILE', platform + source, userLevelGrouping);
				}
			};

			Api.regexStore = {
				'embedlyWhiteList': new RegExp(/(instagram.com|youtube.com|soundcloud.com|twitter.com)/g)
			};

			Api.base64ToFile = function(dataURL) {
				var blob = dataURItoBlob(dataURL);
				return blob;
			};

			Api.buildPixelTracking = function(params, size) {
				var url = config.settings.TrackingHost;

				size = size ? size : 24;

				for (var i = 1; i < size; i++) {
					if (params[i] !== undefined) {
						url += params[i] + '/';
					} else {
						url += '/';
					}
				}

				return url + params[size];
			};

			Api.getJsonFromUrl = function(url) {
				var query = url.split("?")[1];
				var result = {};
				query.split("&").forEach(function(part) {
					var item = part.split("=");
					result[item[0]] = decodeURIComponent(item[1]);
				});
				return result;
			};

			Api.preloadAdvection = function(server, id) {
				// This will trigger advection to start generating a HLS stream
				// We trigger it anytime a user posts a broadcast to tumblr
				$timeout(function(){
					var hls = 'https://hls.advection.net/younowhls/'+server+'/Stream-'+id+'/playlist.m3u8';
					//var hls = '/php/api/broadcast/videoPath/hls=1/broadcastId='+id;
					var video = document.createElement('video');
					video.src = hls;
				}, 0);
			};

			function isHiddenSupported() {
				return typeof(document.hidden || document.msHidden || document.webkitHidden || document.mozHidden) != "undefined";
			}

			function Notification(type, message, id, sticky, time) {
				this.type = type || 'danger';
				this.message = Api.trustedHTML(message);
				this.sticky = sticky || false;
				this.id = id;
				this.group = (sticky ? 'sticky' : 'normal');
				this.time = time || 2700;
				this.active = true;
			}

			// http://stackoverflow.com/questions/4998908/convert-data-uri-to-file-then-append-to-formdata
			function dataURItoBlob(dataURI) {

				// convert base64/URLEncoded data component to raw binary data held in a string
				var byteString;
				if (dataURI.split(',')[0].indexOf('base64') >= 0) {
					byteString = window.atob(dataURI.split(',')[1]);
				} else {
					byteString = window.unescape(dataURI.split(',')[1]);
				}
				// separate out the mime component
				var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

				// write the bytes of the string to a typed array
				var ia = new window.Uint8Array(byteString.length);
				for (var i = 0; i < byteString.length; i++) {
					ia[i] = byteString.charCodeAt(i);
				}

				return new window.Blob([ia], {
					type: mimeString
				});
			}

			return Api;
		}
	];
})

;
