(function() {
	angular.module('younow.core.services')

	.factory('ApiCore', function($window, $http, $document, $q, $sce, $timeout, $interval, $rootScope, $location, $filter) {
		var ApiCore = {};

		/**
		 * @ngdoc object
		 * @name ApiCore
		 * @description
		 *
		 * The ApiCore is part of a set of base services that our apps (mobile & desktop currently)
		 * consume to extend their own versions of the Api service.
		 *
		 */

		/**
		  * @ngdoc
		  * @name ApiCore.Base
		  * @methodOf ApiCore
		  * @param {object} config Requires a config to be passed, if one is not passed to this constructor it will fail to be instantiated.
		  * @description
		  *
		  * The Base method of the ApiCore is the standard way we initialize services. It returns an object which should then extend the functionality of the
		  * app's Api (utility) service. The object has a bounty of useful reusable helper functions as documented below. Remember to extend this core object onto the apps custom one.
		  *
		  * @example
 		   ```
 			   var apiCore = new ApiCore.Base(config);
 			   var Api = angular.extend(apiCore, {});
 		   ```
 		 */
		ApiCore.Base = function(config) {
			if (!config) {
				throw new Error('The ApiCore requires a config');
			}
			/**
			 * @ngdoc
			 * @name ApiCore.os
			 * @propertyOf ApiCore
			 * @description
			 *
			 * Properties: os, browser, and osMajor which is a shortcut to major version number of os
			 * Also adds class names to html tag, to enable custom css styles per device
			 *
			 */
			if (window.UAParser) {
				var parser = new window.UAParser();
				this.os = parser.getOS();
				this.browser = parser.getBrowser();
				if (!this.browser.name) {
					this.browser.name = 'Unknown';
				}
				if (!this.browser.version) {
					this.browser.version = '0';
				}
				if (!this.browser.major) {
					this.browser.major = '' + this.browser.version.substring(0, (this.browser.version.indexOf('.') || 1)) || this.browser.version;
				}
				if (!this.os.name) {
					this.os.name = 'Unknown';
				}
				if (!this.os.version) {
					this.os.version = '0';
				}
				if (!this.os.major) {
					this.os.major = '' + this.os.version.substring(0, (this.os.version.indexOf('.') || 1)) || this.os.version;
				}
				var htmlTag = document.getElementsByTagName('html')[0];
				htmlTag.className += ' ' + this.os.name;
				htmlTag.className += ' v' + this.os.major;
			}

			/**
			 * @ngdoc
			 * @name ApiCore.Base.sortObject
			 * @methodOf ApiCore
			 * @param {object} obj Takes an object to sort.
			 * @description
			 *
			 * This is a formatter function that takes an object and sorts it alphabetically based on its keys
			 *
			 */
			this.sortObject = function(obj) {
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

			/**
	   		  * @ngdoc
	   		  * @name ApiCore.Base.splitter
	   		  * @methodOf ApiCore
			  * @returns {string} The label of the winning option.
	   		  * @param {object} options Takes object of multiple options. The keys correspond to the percent chance that they will be chosen while the value of said keys are the label.
	   		  * @description
	   		  *
	   		  * This helper function gives us a way to choose between one or more options based on a percent chance. It will return the type label of the option.
  			  *
			  * @example
			  ```
				Api..splitter({
			        50: 'control',
			        100: 'variation'
			    });
			  ```
	   		  */
			this.splitter = function(options) {
				if (options && typeof options != "object") {
					throw new Error('Splitter can only take an array');
				}
				var randomNum = Math.floor(Math.random() * 100);
				var option;
				var i = 0;
				var optionsArray = [];
				for (option in options) {
					optionsArray.push(Number(option));
				}
				optionsArray.sort(function(a, b) {
					return a - b;
				});
				for (i; i < optionsArray.length; i++) {
					if (randomNum <= optionsArray[i] || (randomNum >= optionsArray[i] && optionsArray.length - 1 === i)) {
						return options[optionsArray[i]];
					}
				}
			};

			/**
	   		  * @ngdoc
	   		  * @name ApiCore.Base.get
	   		  * @methodOf ApiCore
			  * @returns {object} Returns a promise object that is standard to the $http service, contains the API response.
	   		  * @param {string} method Api endpoint starting after /php/api/ (e.g.: 'younow/user')
			  * @param {object} data Set of params for the get request, corresponds to the backend API.
			  * @param {boolean} usecdn Turns the cdn on/off. Defaults to off.
			  * @param {boolean} secured Turns on https. Deprecated since migrating to https.
	   		  * @description
	   		  *
	   		  * This is a wrapper around the $http.get service offered by angular. It gives us some control in changing our app wide get requests.
  			  *
			  * @example
			  ```
				var getRequest = Api.get('younow/user', {tdi: 23x13t}, true);
				getRequest.then(function(response) {
					console.log(response);
				});
			  ```
	   		  */
			this.get = function(method, data, usecdn, secured) {
				var base = (!usecdn || $window.nonCDN) ? config.settings.ServerLocalBaseUrl : config.settings.ServerCDNBaseUrl;
				var url;

				if (method.substr(0, 4) === 'http') {
					url = method;
				} else if (secured) {
					url = config.settings.ServerSecureLocalBaseUrl + '/php/api/' + method;
				} else {
					url = base + '/php/api/' + method;
				}

				data = data ? data : {};
				if (config.params.host === 'www.younow.com') {
					data.callback = "JSON_CALLBACK";
				}
				if (usecdn && data) {
					data = this.sortObject(data);
				}
				angular.forEach(data, function(value, key) {
					url += "/" + key + "=" + value;
				});

				this.addToStack(method, 'lastApiStack');

				if (window.YouNow.loadingTime && window.YouNow.loadingTime.request) {
					window.YouNow.loadingTime.request();
				}

				if (data.callback) {
					return $http.jsonp(url).success(function(data) {
						if (window.YouNow.loadingTime && window.YouNow.loadingTime.response) {
							window.YouNow.loadingTime.response();
						}
					});
				} else {
					return $http.get(url).success(function(data) {
						if (window.YouNow.loadingTime && window.YouNow.loadingTime.response) {
							window.YouNow.loadingTime.response();
						}
					});
				}
			};

			/**
	   		  * @ngdoc
	   		  * @name ApiCore.Base.post
	   		  * @methodOf ApiCore
			  * @returns {object} Returns a promise object that is standard to the $http service, contains the API response.
	   		  * @param {string} method Api endpoint starting after /php/api/ (e.g.: 'younow/user')
			  * @param {object} data Set of params for the get request, corresponds to the backend API.
			  * @param {boolean} secured Turns on https. Deprecated since migrating to https.
	   		  * @param {boolean} true if sending JSON string to backend rather than default serialized params
	   		  *@description
	   		  *
	   		  * This is a wrapper around the $http.post service offered by angular. It gives us some control in changing our app wide get requests.
  			  *
			  * @example
			  ```
				var postRequest = Api.post('broadcast/add', {channelId: 75522});
				postRequest.then(function(response) {
					console.log(response);
				});
			  ```
	   		  */

			this.post = function(method, data, secured, customUrl, noSerialize) {
				var url;
				var headers;

				if (secured) {
					url = config.settings.ServerSecureLocalBaseUrl + '/php/api/' + method;
				} else {
					url = config.settings.ServerLocalBaseUrl + '/php/api/' + method;
				}

				if (customUrl) {
					url = customUrl;
				}

				data = noSerialize ? data : this.serialize(data);

				if (window.YouNow.loadingTime && window.YouNow.loadingTime.request) {
					window.YouNow.loadingTime.request();
				}

				return $http({
					method: 'POST',
					//withCredentials:true,
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
					},
					data: data,
					url: url
				}).success(function(data) {
					if (window.YouNow.loadingTime && window.YouNow.loadingTime.response) {
						window.YouNow.loadingTime.response();
					}
				});
			};

			/**
			  * @ngdoc
			  * @name ApiCore.Base.poll
			  * @methodOf ApiCore
			  * @param {function} callback A callback function for the poll to execute.
			  * @param {string} id The string to index the poll in Api.polls (e.g.: Api.polls.testPoll)
			  * @param {number} delay The delay in seconds before the next interval.
			  * @param {number} defaultDelay In case the next interval time was changed to an invalid number.
			  * @description
			  *
			  * This is a helper function to make Api requests on an interval basis. It also indexes every ongoing poll in a very handy Api.polls object.
			  *
			  * @example
			  ```
				Api.poll(function() {
					//make the API request in here and do other fancy things!
				}, 'testPoll', 30);
			  ```
			  */
			this.polls = {};

			this.poll = function(callback, id, delay, defaultDelay) {
				// Setup object to keep track of polls
				if (!this.polls) {
					this.polls = {};
				}
				// If poll exists, cancel
				if (this.polls[id]) {
					$interval.cancel(this.polls[id]);
				}
				// Fall back to default delay amounts
				if (!defaultDelay) {
					defaultDelay = 30;
				}
				if (!delay) {
					delay = defaultDelay;
				}
				// Create a new poll
				this.polls[id] = $interval(function() {
					// if (navigator.onLine) {
					callback();
					// }
				}, delay * 1000);
			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.trustedSrc
			 * @methodOf ApiCore
			 * @returns {object} An object that can be passed to $sce.getTrustedResourceUrl(value) to obtain the original value.
			 * @param {string} src A string representing a resource (js, css, image, video) that will be used in an ng-src or other angular related directive.
			 * @description
			 *
			 * Sanitizes unsafe source urls for later use in html templates by directives.
			 *
			 */
			this.trustedSrc = function(src) {
				return $sce.trustAsResourceUrl(src);
			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.trustedSrc
			 * @methodOf ApiCore
			 * @returns {object} An object that can be passed to $sce.getTrustedResourceUrl(value) to obtain the original value.
			 * @param {string} text Html string that will be used in a directive.
			 * @description
			 *
			 * Sanitizes unsafe html to be used in directives and templates. If the argument is missing the function returns the argument with no changes.
			 *
			 */
			this.trustedHTML = function(text) {
				if (!text.$$unwrapTrustedValue) {
					return $sce.trustAsHtml(text);
				} else {
					return text;
				}
			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.serialize
			 * @methodOf ApiCore
			 * @returns {object} An object that can be passed to $sce.getTrustedResourceUrl(value) to obtain the original value.
			 * @param {object} obj An object to serialize before sending it in a post request, used internally in the Api.post.
			 * @description
			 *
			 * Need to serialize data, because AngularJS POSTs json by default
			 * http://victorblog.com/2012/12/20/make-angularjs-http-service-behave-like-jquery-ajax/
			 *
			 */
			this.serialize = function(obj) {
				var query = '',
					name, value, fullSubName, subName, subValue, innerObj, i;

				for (name in obj) {
					value = obj[name];

					if (value instanceof Array) {
						for (i = 0; i < value.length; ++i) {
							subValue = value[i];
							fullSubName = name + '[' + i + ']';
							innerObj = {};
							innerObj[fullSubName] = subValue;
							query += this.serialize(innerObj) + '&';
						}
					} else if (value instanceof Object) {
						for (subName in value) {
							subValue = value[subName];
							fullSubName = name + '[' + subName + ']';
							innerObj = {};
							innerObj[fullSubName] = subValue;
							query += this.serialize(innerObj) + '&';
						}
					} else if (value !== undefined && value !== null) {
						query += encodeURIComponent(name) + '=' + encodeURIComponent(value) + '&';
					}
				}

				return query.length ? query.substr(0, query.length - 1) : query;
			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.fullName
			 * @methodOf ApiCore
			 * @returns {string} The user's full name.
			 * @param {object} user The user that holds information such as: profileUrlString, username, lastname and firstname.
			 * @description
			 *
			 * Standard way of finding out a user's preferred display name.
			 *
			 */
			this.fullName = function(user) {
				if (!user) {
					return '';
				}
				var profile = user.profile || user.profileUrlString;
				var useprofile = user.useprofile || user.useProfile;
				if (useprofile == 1) {
					return profile;
				}
				if (!user.firstName && user.username) {
					return user.username;
				}
				return (user.firstName || '') + (user.lastName ? ' ' + user.lastName : '');
			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.friendlyName
			 * @methodOf ApiCore
			 * @returns {string} The user's friendly name (profile string or first name).
			 * @param {object} user Helper function to check the users preference
			 * @description
			 *
			 * Standard way of finding out if a user wants to use their firstname or their profile name.
			 *
			 */
			this.friendlyName = function(user) {
				return user.useprofile !== "0" ? user.profile : user.firstName;
			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.cleanLocation
			 * @methodOf ApiCore
			 * @returns {string} The user's location. (NY, US)
			 * @param {object} data Location object that holds city, state or country information.
			 * @param {boolean} twopart Only state and country will be shown.
			 * @description
			 *
			 * Standard way of finding out if a user wants to use their firstname or their profile name.
			 *
			 */
			this.cleanLocation = function(data, twopart) {
				if (twopart && data.state && !data.city) {
					data.city = data.state;
				}
				return (data.city ? data.city + ', ' : '') + (data.state && !twopart ? data.state + ' ' : '') + data.country;
			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.linksniffer
			 * @propertyOf ApiCore
			 * @description
			 *
			 * A regex that searchs and captures links.
			 *
			 */
			this.linksniffer = /((http(s?)(:\/\/))?(([w]{3}|(.*))\.)?([a-zA-Z|0-9])+\.(com(\.au)?|org|me|net|ly|be|gl|co|it|info|(co(\.))?uk|ca|nz|tv)(\/[^\s]+)*)+/g;

			/**
			 * @ngdoc
			 * @name ApiCore.Base.findLinks
			 * @methodOf ApiCore
			 * @returns {Array} A set of links captured by the method.
			 * @param {string} text Text to search through.
			 * @description
			 *
			 * Helper function that seeks out links and returns them.
			 *
			 */
			this.findLinks = function(text) {
				if (!text) {
					return [];
				}
				// Strip out www which causes issues
				text = text.replace(/:\/\/www./g, '://');
				text = text.replace(/www./g, ' http://');
				// Strip out forced spaces
				text = text.replace(/&nbsp;/g, ' ');
				// Find links
				var links = [];
				var linksniffer = this.linksniffer;
				text.split(/\s+/).map(function(t) {
					if (t.match(linksniffer)) {
						links.push(t);
					}
				});
				return links;
			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.linkify
			 * @methodOf ApiCore
			 * @returns {string} Stringified html that replaces the texts link with an a tag.
			 * @param {object} text Text to sift through and linkify.
			 * @description
			 *
			 * Looks through text to find links and turn them into html a tags. Returns the argument is invalid params.
			 *
			 */
			this.linkify = function(text) {
				if (!text) {
					return text;
				}
				if (text.$$unwrapTrustedValue) {
					text = text.$$unwrapTrustedValue(text);
				}
				// If the text contains HTML, only linkify the text that precedes it
				var htmlStart = text.indexOf('<');
				var plainText = htmlStart > -1 ? text.substr(0, htmlStart) : text;
				var html = htmlStart > -1 ? text.substr(htmlStart) : '';
				var linksniffer = this.linksniffer;
				// Replace URLs with links
				var tokens = plainText.split(' ').map(function(t) {
					return t.replace(linksniffer, function(url) {
						var href = url.substr(0, 4) !== 'http' ? 'http://' + url : url;

						return '<a href="' + href.replace(/("|').*$/g, '') + '" target="_blank" rel="nofollow">' + url.replace(/("|').*$/g, '') + '</a>';
					});
				});
				// Return the result
				return tokens.join(' ') + html;
			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.stripHTML
			 * @methodOf ApiCore
			 * @returns {string} The text without html.
			 * @param {string} text The text to search through.
			 * @description
			 *
			 * Removes all HTML from a string.
			 *
			 */
			this.stripHTML = function(text) {
				//put a space after all links that looks normal
				// text = text.replace(/((\w+:\/\/)[-a-zA-Z0-9:@;?&=\/%\+\.\*!'\(\),\$_\{\}\^~\[\]`#|]+)/g, '$1 ');
				return text.replace(/<[^>]+>/gm, '');
			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.prepareDescription
			 * @methodOf ApiCore
			 * @returns {text} The description wrapped in trustedHtml object (An object that can be passed to $sce.getTrustedHtml(value) to obtain the original value).
			 * @param {text} User description to prepare.
			 * @description
			 *

			 * Prepares the description by sanitizing it and finding if there are any links in the description to linkify. It also checks if there is no description.
			 * In that case it sets it as "This profiles does not have a description".
			 *
			 */
			this.prepareDescription = function(text) {
				text = this.linkify(text) || "This profile does not have a description";
				return $sce.trustAsHtml(text);
			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.goto
			 * @methodOf ApiCore
			 * @param {string} The location to take the user (e.g.: 'www.younow.com').
			 * @description
			 *
			 * Uses the $location service internally to send the user to the specified location.
			 *
			 */
			this.goto = function(path) {
				if (!path) {
					return false;
				}
				// Remove hardcoded host
				if (path.substr(0, 4) == 'http') {
					path = path.slice(path.indexOf(path.split('/')[2]));
				}
				$location.path(path);
			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.squashedNumber
			 * @methodOf ApiCore
			 * @returns {number} The number that was squashed or truncated.
			 * @param {number} num The number to squash.
			 * @param {number} size The number of digits allowed.
			 * @description
			 *
			 * With a set size and a number, it truncates the number to a shortened version. (16000 becomes 16k). Currently supports up to 9 digit size (billion).
			 *
			 */
			this.squashedNumber = function(num, size) {
				if (num === undefined || num === null) {
					return '';
				}
				if (typeof num === "string") {
					num = Number(num.replace(",", ""));
				}
				var digits = num.toString().length;
				var decimals = (size == digits - 1) ? 1 : 0;
				if (digits > size && digits >= 10) {
					num = $filter('number')(num / 1000000000, decimals) + 'B';
				} else if (digits > size && digits >= 7) {
					num = $filter('number')(num / 1000000, decimals) + 'M';
				} else if (digits > size && digits >= 4) {
					num = $filter('number')(num / 1000, decimals) + 'k';
				} else {
					num = $filter('number')(num);
				}
				return num;
			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.store
			 * @methodOf ApiCore
			 * @returns {string} This does not always return a string. It will return null if nothing is found and it will preserve type (boolean, string, object, number).
			 * @param {string} key The key to access the localStorage item.
			 * @param {string} value A value to override the localStorage item or create a new one, note that this does not have to be a string can be any type.
			 * @description
			 *
			 * Helper function to access localStorage in a crossbrowser way. Simple interface and preserves the types stored.
			 * Learn more here: https://gist.github.com/Fluidbyte/4718380
			 *
			 */
			this.store = function(key, value) {
				//https://gist.github.com/Fluidbyte/4718380

				var lsSupport = true;
				try {
					$window.localStorage.setItem('isLocalStorage', true);
				} catch (error) {
					lsSupport = false;
				}
				var data;

				// If value is detected, set new or modify store
				if (typeof value !== "undefined" && value !== null) {
					// Convert object values to JSON
					if (typeof value === 'object') {
						value = JSON.stringify(value);
					}
					// Set the store
					if (lsSupport) {
						$window.localStorage.setItem(key, value);
					} else {
						createCookie(key, value, 3650);
					}
				}

				// No value supplied, return value
				if (typeof value === "undefined") {
					// Get value
					data = lsSupport ? $window.localStorage.getItem(key) : readCookie(key);
					// Try to parse JSON...
					try {
						data = JSON.parse(data);
					} catch (e) {
						data = data;
					}
					return data;
				}

				// Null specified, remove store
				if (value === null) {
					if (lsSupport) {
						$window.localStorage.removeItem(key);
					} else {
						createCookie(key, '', -1);
					}
				}

			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.ArrayToObject
			 * @methodOf ApiCore
			 * @returns {object} The object that was converted from the Array, stored by index and array value. {0: 'first value'}
			 * @param {Array} array The array to convert into an object.
			 * @description
			 *
			 * Simple function to convert an array into an object. The object's keys are set as the index corresponding to the items position in the array.
			 *
			 */
			this.ArrayToObject = function(array) {
				var newObject = {},
					i;
				for (i = 0; i < array.length; ++i) {
					newObject[i] = array[i];
				}
				return newObject;
			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.addToStack
			 * @methodOf ApiCore
			 * @param {object} data The data to add to the stack
			 * @param {string} stackName The name of the stack to put this data into. Currently only the lastClickStack and the lastApiStack exist. Both are stored on the window object.
			 * @description
			 *
			 * Adds extra data for bugsnag tracking for what the user was doing (making API requests or clicking on certain elements).
			 *
			 */
			this.addToStack = function(data, stackName) {
				if ($window.bugsnagAdditionalParams && $window.bugsnagAdditionalParams[stackName]) {
					if ($window.bugsnagAdditionalParams[stackName].length === 5) {
						$window.bugsnagAdditionalParams[stackName].pop();
					}
					$window.bugsnagAdditionalParams[stackName].unshift(data);
					$window.bugsnagAdditionalParams[stackName + 'Object'] = this.ArrayToObject($window.bugsnagAdditionalParams[stackName]);
				}
			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.generateTrackingId
			 * @methodOf ApiCore
			 * @returns {string} text Returns an alphanumeric string that can be used as a tracking Id.
			 * @description
			 *
			 * Randomly generates a 10 character alphanumeric string.
			 *
			 */
			this.generateTrackingId = function() {
				var text = "",
					possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

				for (var i = 0; i < 10; i++) {
					text += possible.charAt(Math.floor(Math.random() * possible.length));
				}

				return text;
			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.getLinkType
			 * @methodOf ApiCore
			 * @returns {string} The type of page the user would be landing on (or the type of link rather).
			 * @param {string} requestUri The request uri of the desired page or the current page.
			 * @param {string} search Search parameters in the request URI.
			 * @description
			 *
			 * Runs through the request URI and the search query to figure out the type of page this user would see when landing on the app.
			 *
			 */
			this.getLinkType = function(requestUri, search) {
				var linkType;
				var pieces = requestUri.split('/');
				var entityTypes = {
					"b": "broadcast",
					"p": "post",
					"c": "comment"
				};
				// Root
				if (requestUri == '/') {
					linkType = 'root';
				} else
				// Yozio redirect
				if (search.indexOf('?yozio') !== -1) {
					linkType = 'yozio';
				} else
				// Search
				if (search.indexOf('?q=') !== -1) {
					linkType = 'search';
				} else
				// Explore / Tags
				if (pieces[1] === 'explore') {
					linkType = requestUri.length > 9 ? 'tag' : 'explore';
				} else
				// Dedicated states
				if (['featured', 'about', 'info', 'policy', 'thankyou', 'getpartnered'].indexOf(pieces[1]) !== -1) {
					linkType = pieces[1];
				} else
				// Entity types
				if (['b', 'p', 'c'].indexOf(pieces[5]) !== -1) {
					linkType = entityTypes[pieces[5]];
				} else
				// Forced Profile
				if (pieces[2] === 'channel') {
					linkType = 'profile';
				} else
				// Tracked Profile
				if (pieces[2] === '0') {
					linkType = 'profile';
				} else
				// Profile (catchall)
				if (pieces.length === 2) {
					linkType = 'profile';
				} else {
					linkType = 'other';
				}
				return linkType;
			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.getLinkTerm
			 * @methodOf ApiCore
			 * @param {string} requestUri The request uri of the desired page or the current page.
			 * @param {string} search Search parameters in the request URI.
			 * @param {string} linkType Search parameters in the request URI.
			 * @returns {string} The link term
			 * @description
			 *
			 * Uses the linktype, requestUri and search param to retrieve a link term.
			 *
			 */
			this.getLinkTerm = function(requestUri, search, linkType) {
				var linkTerm;
				if (['search'].indexOf(linkType) !== -1) {
					linkTerm = search.split('?q=')[1];
				} else
				if (['info', 'policy'].indexOf(linkType) !== -1) {
					linkTerm = requestUri.split('/')[3];
				} else
				if (['tag', 'featured'].indexOf(linkType) !== -1) {
					linkTerm = requestUri.split('/')[2];
				} else
				if (['profile', 'broadcast', 'comment', 'post'].indexOf(linkType) !== -1) {
					linkTerm = requestUri.split('/')[1];
				}
				return linkTerm;
			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.getReferrer
			 * @methodOf ApiCore
			 * @returns {string} Returns the social media referrer by parsing the document.referrer.
			 */
			this.getReferrer = function() {
				var referrer = document.referrer;
				var domain = document.referrer.split('/')[2];
				if (document.referrer.length === 0) {
					referrer = 'direct';
				} else if (document.referrer.indexOf('facebook.com/') !== -1) {
					referrer = 'facebook';
				} else if (document.referrer.indexOf('t.co/') !== -1) {
					referrer = 'twitter';
				} else if (document.referrer.indexOf('younow.com/') !== -1) {
					referrer = 'younow';
				} else if (document.referrer.indexOf('google') !== -1) {
					referrer = 'google';
				} else {
					referrer = domain;
				}
				return referrer;
			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.getLinkTerm
			 * @methodOf ApiCore
			 * @returns {string} The referrer extracted from the path.
			 */
			this.getReferrerPath = function() {
				var path = document.referrer.substr(document.referrer.indexOf('://') + 3); // extract referrer
				path = encodeURIComponent(path).replace(/_/g, "__").replace(/%/g, "_"); // can't contain %
				path = path.substr(0, 299); // can't exceed 300 characters
				return path;
			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.buildPixelTracking
			 * @methodOf ApiCore
			 * @param {Array} params An array that holds all of the params for the tracking pixel url.
			 * @param {number} size A size to optionally dynamically build the tracking pixel. If left undefined, defaults to 24.
			 * @returns {string} A fully built url the includes all of the params in the right positions.
			 */
			this.buildPixelTracking = function(params, size) {
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

			/**
			 * @ngdoc
			 * @name ApiCore.Base.trackError
			 * @methodOf ApiCore
			 * @param {string} message Message to send bugsnag.
			 * @description
			 *
			 * Sends custom error messages to bugsnag, can be invoked whenever. This doesn't necessariliy have to wait for an error to occur.
			 *
			 */
			this.trackError = function(message) {
				if ($window.Bugsnag) {
					$window.Bugsnag.notify(message);
				}
			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.pad
			 * @methodOf ApiCore
			 * @param {string} n The ???
			 * @param {string} width width of the element.
			 * @param {string} z Z-index
			 * @returns {string} The width
			 * @description
			 *
			 * ??? Not sure what this does but it looks like it returns a padding depending on some variables.
			 *
			 */
			this.pad = function(n, width, z) {
				z = z || '0';
				n = n + '';
				return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
			};

			/**
			 * @ngdoc
			 * @name ApiCore.Base.isMEdge
			 * @methodOf ApiCore
			 * @returns {boolean} Checks if user is on microsoft edge.
			 */
			this.isMEdge = function() {
				if (/Edge\/12./i.test(navigator.userAgent)) {
					return true;
				} else {
					return false;
				}
			};

			this.pixelSafe = function(string, maxlength) {
				if (!maxlength) {
					maxlength = 50;
				}
				string = encodeURIComponent(string).replace(/_/g, "__").replace(/%/g, "_"); // can't contain %
				string = string.substr(0, maxlength - 1); // can't exceed maxlength characters
				return string;
			};

			//set up device id unless user has one in cache, important to do this before extending the core
			if (!this.store('trpx_device_id')) {
				window.newVisitor = true;
			}

			/**
			 * @ngdoc
			 * @name ApiCore.Base.generateDynamicApi
			 * @methodOf ApiCore
			 * @returns {string} Node of the dynamic API.
			 */
			this.generateDynamicApi = function(key) {
				if (config.settings.apiMap) {
					return config.settings.apiMap.DNS[config.settings.apiMap[key].DNS] + config.settings.apiMap[key].URL;
				} else {
					console.warn('Oops, no apiMap provided');
				}
			};

		};

		// For permormance optimization
		$window.countWatchers = function() {
			var elts = document.getElementsByClassName('ng-scope');
			var watches = [];
			var visited_ids = {};
			for (var i = 0; i < elts.length; i++) {
				var scope = angular.element(elts[i]).scope();
				if (scope.$id in visited_ids) {
					continue;
				}
				visited_ids[scope.$id] = true;
				watches.push.apply(watches, scope.$$watchers);
			}
			return watches.length;
		};

		// Helper functions for accessing data in the console
		$window.currentScope = function() {
			return angular.element($window.$0).scope();
		};
		$window.getService = function(name) {
			if (window.location.search.indexOf('debugInfoEnabled') == -1 && !window.readCookie('debugInfoEnabled')) {
				console.warn('Use the query param with the debugInfoEnabled option to use this feature.');
			} else {
				return angular.element(document.querySelector('.ng-scope')).injector().get(name);
			}
		};

		function createCookie(key, value, exp) {
			var date = new Date();
			date.setTime(date.getTime() + (exp * 24 * 60 * 60 * 1000));
			var expires = "; expires=" + date.toGMTString();
			document.cookie = key + "=" + value + expires + "; path=/";
		}

		function readCookie(key) {
			var nameEQ = key + "=";
			var ca = document.cookie.split(';');
			for (var i = 0, max = ca.length; i < max; i++) {
				var c = ca[i];
				while (c.charAt(0) === ' ') {
					c = c.substring(1, c.length);
				}
				if (c.indexOf(nameEQ) === 0) {
					return c.substring(nameEQ.length, c.length);
				}
			}
			return null;
		}

		return ApiCore;

	});

})();
