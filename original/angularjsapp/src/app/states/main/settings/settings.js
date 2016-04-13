angular.module('younow.settings', [])

.config(["$stateProvider", function config($stateProvider) {

	$stateProvider.state('main.settings', {
		url: '/settings',
		templateUrl: 'angularjsapp/src/app/states/main/settings/settings.tpl.html',
		controller: 'SettingsCtrl'
	});

}])

.controller('SettingsCtrl', ["$scope", "$window", "$timeout", "$state", "Api", "session", "config", "Facebook", "eventbus", "trackingPixel", "$modal", "ab", function HomeController($scope, $window, $timeout, $state, Api, session, config, Facebook, eventbus, trackingPixel, $modal, ab) {

	$scope.editing = true;
	$scope.session = session;
	var pagesAuth;
	$scope.fbPages = {};
	$scope.config = config;
	$scope.onbehalf = {
		userId: 0
	};

	$scope.emailRegex = /^((\"[^\"\f\n\r\t\v\b]+\")|([\w\!\#\$\%\&\'\*\+\-\~\/\^\`\|\{\}]+(\.[\w\!\#\$\%\&\'\*\+\-\~\/\^\`\|\{\}]+)*))@((\[(((25[0-5])|(2[0-4][0-9])|([0-1]?[0-9]?[0-9]))\.((25[0-5])|(2[0-4][0-9])|([0-1]?[0-9]?[0-9]))\.((25[0-5])|(2[0-4][0-9])|([0-1]?[0-9]?[0-9]))\.((25[0-5])|(2[0-4][0-9])|([0-1]?[0-9]?[0-9])))\])|(((25[0-5])|(2[0-4][0-9])|([0-1]?[0-9]?[0-9]))\.((25[0-5])|(2[0-4][0-9])|([0-1]?[0-9]?[0-9]))\.((25[0-5])|(2[0-4][0-9])|([0-1]?[0-9]?[0-9]))\.((25[0-5])|(2[0-4][0-9])|([0-1]?[0-9]?[0-9])))|((([A-Za-z0-9\-])+\.)+[A-Za-z\-]+))$/;
	$scope.checkWebsiteUrl = function() {
		var regex = /((http[s]?:\/{2})?www.facebook.com\/.+)/;
		if (regex.test($scope.settings.user.websiteUrl)) {
			$scope.toEdit('websiteUrl', $scope.settings.user.websiteUrl);
			$scope.websiteUrlError = false;
		} else {
			if ($scope.edits && $scope.edits.websiteUrl) {
				delete $scope.edits.websiteUrl;
			}
			$scope.websiteUrlError = true;
		}
	};
	//################################################################

	$scope.newSubscription = function(channelId, sub) {
		var modal = $modal.subscribeModal(channelId, {
			source: 'SETTINGS'
		});
		modal.result.then(function(data) {
			if (window.YouNow.reloadSubscriptions) {
				getSubscriptions('SETTINGS');
			}
			window.YouNow.reloadSubscriptions = false;
		});
		modal.result.catch(function(data) {
			if (window.YouNow.reloadSubscriptions) {
				getSubscriptions('SETTINGS');
			}
			window.YouNow.reloadSubscriptions = false;
		});
	};
	$scope.modifySubscription = function(channelId, sub) {
		$modal.subscribeModal(channelId, {
			sub: sub,
			state: 'payment',
			source: 'SETTINGS'
		});
	};
	$scope.cancelSubscription = function(channelId, sub) {
		$modal.subscribeModal(channelId, {
			sub: sub,
			state: 'cancel',
			source: 'SETTINGS'
		});
	};

	var getSubscriptions = function(source) {
		if (session.loggedIn) {
			Api.get('channel/subscriptions/userId=' + $scope.onbehalf.userId).success(function(data) {
				$scope.subscriptions = {};
				if (!data.errorCode) {
					for (var k in data.subscriptions) {

						$scope.subscriptions[k] = data.subscriptions[k];

						if ($scope.subscriptions[k].subscriptionState.indexOf('CANCEL') > -1) {
							// subscribed
							delete $scope.session.subStatus[$scope.subscriptions[k].channelId];
						} else {
							// not subscribed
							$scope.session.subStatus[$scope.subscriptions[k].channelId] = true;
						}
						/*
						if ($scope.subscriptions[k].channelName=='Heezy') {
							$scope.subscriptions[k].subscriptionState = 'SUBSCRIPTION_ACTIVE';
							session.subStatus[ $scope.subscriptions[k].channelId ] = true;
						}
						*/
						$scope.subscriptions[k].channelBadge = config.settings.BadgeBaseUrl + '/' + $scope.subscriptions[k].channelId + '/' + $scope.subscriptions[k].subscriptionType + '/badge@2x.png';
						$scope.subscriptions[k].channelThumb = config.settings.ServerCDNBaseUrl + '/php/api/channel/getImage/channelId=' + $scope.subscriptions[k].channelId;
						$scope.subscriptions[k].channelNoThumb = config.settings.ServerCDNBaseUrl + '/images/nothumb.jpg';

						$scope.subscriptions[k].paidThroughDate = $scope.subscriptions[k].paidThroughDate.replace(/-/g, '.');

					}

				} else {
					Api.showError(data);
				}
			});
		}
	};
	var getSubscription = function(k, subscription) {
		if (!subscription || !subscription.subscriptionId) {
			return false;
		}

	};

	// Show the initial tab
	if ($window.location.hash && ['#accounts', '#privacy', '#notifications', '#subscriptions'].indexOf($window.location.hash) !== -1) {
		$scope.page = $window.location.hash.substr(1);

	} else {
		$scope.page = 'info';
	}

	// Display an error if required
	if ($window.location.search.substr(0, 5) == "?err=") {
		Api.showTopNotification("Uh oh! You don't have an active YouTube account!");
		// TODO: Show a different error message for different situations
	}

	var fetchSettings = function() {
		if (session.loggedIn) {
			if ($scope.onbehalf.userId === 0) {
				$scope.onbehalf.userId = session.user.userId;
			}
			Api.get('channel/settings', {
				userId: $scope.onbehalf.userId
			}).success(function(data) {
				if (data.directStreaming) {
					data.directStreaming.url = 'rtmp://' + data.directStreaming.host + '/liveapp';
				}
				// Parse out the option array
				if (data.user) {
					angular.forEach(data.options, function(option) {
						if (option.optionValue == 8) {
							data.pubTwitter = option;
						}
						if (option.optionValue == 32) {
							data.keepYoutube = option;
						}
						if (option.optionValue == 64) {
							data.pubFacebook = option;
						}
						if (option.optionValue == 256) {
							data.youtubeSimulcast = option;
						}
						if (option.optionValue == 512) {
							data.hideCity = option;
						}
						if (option.optionValue == 1024) {
							data.youtubeAnnotations = option;
						}
						if (option.optionValue == 4096) {
							data.pubTumblr = option;
						}
						if (option.optionValue == 8192) {
							data.getUpdates = option;
						}
					});
					data.user.useprofile = Number(data.user.useprofile);
					$scope.settings = data;
				}
				if (!data.user) {
					$timeout(function() {
						Api.showError(data);
						$state.go('main.channel.detail');
					}, 0);
				}
			});
		}
	};

	$scope.fetchSettings = function() {
		fetchSettings();
	};

	// Grab settings, or wait if not logged in yet
	if (session.loggedIn) {
		fetchSettings();
		getSubscriptions();
	}

	// Listen for when the user logs in / out
	eventbus.subscribe('session:loggedIn', function(event, loggedIn) {
		if (loggedIn) {
			fetchSettings();
			getSubscriptions();
		} else {
			$timeout(function() {
				$state.go('main.channel.detail');
			}, 0);
		}
	}, 'settings', $scope);

	$scope.switchTab = function(tab) {
		$scope.page = tab;
		$window.location.hash = '#' + $scope.page;
	};

	$scope.startEdit = function() {
		$scope.editing = true;
	};

	$scope.cancelEdit = function() {
		// Clear edit mode
		$scope.editing = false;
		// Re-fetch settings from server to return to normal
		fetchSettings();
	};

	$scope.toEdit = function(key, value) {
		// Set editing to true in order to show Save / Cancel buttons
		$scope.editing = true;
		// If placeholder value is selected, remove the option from edits
		if (value == 'placeholder') {
			if ($scope.edits && $scope.edits[key]) {
				delete $scope.edits[key];
			}
			return false;
		}
		// Keep track of the option which was edited
		if (!$scope.edits) {
			$scope.edits = {};
		}
		$scope.edits[key] = value;
	};
	$scope.toEditGoodies = function(key, value) {
		// Set editing to true in order to show Save / Cancel buttons
		$scope.editing = true;
		// Keep track of the option which was edited
		if (!$scope.edits) {
			$scope.edits = {};
		}
		if (!$scope.edits.disabledGoodies) {
			$scope.edits.disabledGoodies = {};
		}
		$scope.edits.disabledGoodies[key] = value;
	};

	$scope.saveChanges = function() {
		if ($scope.infoForm.$invalid) {
			if ($scope.page !== 'info') {
				$scope.page = 'info';
			}
			eventbus.notifySubscribers('settings:invalid');
			return false;
		}
		if ($scope.edits) {
			$scope.edits.userId = $scope.onbehalf.userId;
			$scope.edits.channelId = $scope.onbehalf.userId;

			// goodies
			for (var goo in $scope.edits.disabledGoodies) {
				var track = {
					event: 'GOODIE_ON',
					extradata: goo
				};
				if ($scope.edits.disabledGoodies[goo]) {
					track.event = 'GOODIE_OFF';
				}
				trackingPixel.capture(track);
			}
			$scope.edits.disabledGoodies = JSON.stringify($scope.edits.disabledGoodies);

			// all
			Api.post('channel/updateSettings', $scope.edits).success(function(data) {
				if (!data.errorCode) {
					Api.showTopNotification('Settings Saved', 'success');
				} else {
					Api.showError(data);
				}
				fetchSettings();
				session.getSession();
			});
			if ($scope.edits.facebookPageId) {
				$scope.settings.websiteUrl = "https://www.facebook.com/pages/" + $scope.edits.facebookPageTitle + '/' + $scope.edits.facebookPageId;
				$scope.settings.user.facebookPageId = $scope.edits.facebookPageId;
				$scope.settings.user.facebookPageToken = $scope.edits.facebookPageToken;
				$scope.settings.user.facebookPageTitle = $scope.edits.facebookPageTitle;
				$scope.gaEvent('CONNECT', 'SUCCESS_FBPAGES', 'SETTINGS');
			}
			delete $scope.edits;
		}
		$scope.fbPages.editing = false;
		$scope.editing = false;
	};


	$scope.disconnect = function(type) {
		var params = {
			userId: $scope.onbehalf.userId,
			channelId: $scope.onbehalf.userId
		};
		if (type === 'deactivation') {
			params.deactivation = 1;
		} else {
			params[type + 'Connected'] = 0;
		}
		if (type === 'facebook') {
			params.facebookPageConnected = 0;
			params.facebookOption = 0;
			params.option_64 = 0; //remove FB automatic posting
		}
		if (Api.store('lastNetwork') && type === 'deactivation') {
			session.authenticate[Api.store('lastNetwork')](true)
				.then(function(response) {
					if (response) {
						// Add extra data
						response.locale = config.UILocale;
						response.channelId = $scope.onbehalf.userId || response.channelId;
						response.inviteString = session.inviteString || session.channelId;
						response.srcId = session.srcId || 0;
						response.tmsid = window.YouNow.Bootstrap.tmId || '';
						response.userId = $scope.onbehalf.userId;
						var concatedParams = angular.extend({}, params, response);
						Api.post('channel/updateSettings', concatedParams).success(function(data) {
							if (!data.errorCode) {
								$scope.terminating = false;
								$scope.terminated = true;
								Api.showTopNotification('Logging you out...', 'success');
								session.logout();
							} else {
								Api.showError(data);
							}
							fetchSettings();
						});

					}
				});
		}
		if (type !== 'deactivation') {
			Api.post('channel/updateSettings', params).success(function(data) {
				if (!data.errorCode) {
					Api.showTopNotification('Account Disconnected', 'success');
					session.getSession();
				} else {
					Api.showError(data);
				}
				fetchSettings();
			});
		}
	};

	$scope.loadFbPages = function() {
		$scope.fbPages.editing = true;
		$scope.fbPages.hasPages = true;
		if (!$scope.fbPages.pages || $scope.fbPages.pages.length === 0) {
			$scope.gaEvent('CONNECT', 'ATTEMPT_FBPAGES', 'SETTINGS');
			Facebook.getPagesList()
				.then(function(response) {
					if (response.data.length > 0) {
						pagesAuth = response.authResponse;
						$scope.fbPages.pages = response.data;
						$scope.fbPages.fbPageSelected = response.data[0];
						$scope.updateFbPage();
						$scope.fbPages.hasPages = true;
					} else {
						$scope.fbPages.hasPages = false;
						$scope.gaEvent('CONNECT', 'ERROR_FBPAGES', 'SETTINGS');
					}
				});
		} else {
			$scope.fbPages.fbPageSelected = $scope.fbPages.pages[0];
			$scope.updateFbPage();
		}
	};

	$scope.changeFbState = function(state) {
		if (state === 'cancel') {
			$scope.fbPages.editing = false;
			$scope.fbPages.fbPageSelected = undefined;
			if ($scope.edits && $scope.edits.facebookPageTitle) {
				delete $scope.edits.facebookPageToken;
				delete $scope.edits.facebookPageTitle;
				delete $scope.edits.facebookPageId;
			}
		}
		if (state === 'disconnect') {
			$scope.updateFbPage(true);
			$scope.toEdit('option_64', 0); //remove FB automatic posting
			$scope.saveChanges();
		}
	};

	$scope.updateFbPage = function(reset) {
		if (reset) {
			$scope.toEdit('facebookPageConnected', 0);
			$scope.toEdit('facebookOption', 0);
			delete $scope.edits.facebookPageToken;
			delete $scope.edits.facebookPageTitle;
			delete $scope.edits.facebookPageId;
		} else {
			$scope.toEdit('facebookOption', 1);
			$scope.toEdit('facebookPageTitle', angular.copy($scope.fbPages.fbPageSelected.name));
			$scope.toEdit('facebookPageId', angular.copy($scope.fbPages.fbPageSelected.id));
			if (!$scope.edits.facebookPageToken || pagesAuth.accessToken !== $scope.edits.facebookPageToken) {
				$scope.toEdit('facebookPageToken', pagesAuth.accessToken);
			}
		}
	};

	$scope.onbehalf.reset = function() {
		$scope.onbehalf.userId = session.user.userId;
		fetchSettings();
		getSubscriptions();
	};

	$scope.onbehalf.update = function() {
		fetchSettings();
		getSubscriptions();
	};

	$scope.checkYoutube = function(state) {
		if (state === 1) {
			Api.get('channel/youtubeLiveEnabled', {
				userId: $scope.onbehalf.userId
			}).success(function(data) {
				if (data.errorCode !== 0) {
					$scope.settings.youtubeSimulcast.state = 0;
					$scope.toEdit('option_256', 0);
					Api.showTopNotification('Live streaming is not enabled on your Youtube account: <a target="_blank" href="https://www.youtube.com/live_streaming_signup">https://www.youtube.com/live_streaming_signup</a>', 'danger', false, false, 5000);
					// Maybe this is a better URL: https://www.youtube.com/live_dashboard_splash
				}
			});
		}
	};

	$scope.togglePushSubscribed = function(state) {
		var trackevent = {
			'field3': Api.os.name.split(' ')[0],
			'field4': Api.browser.name.split(' ')[0],
			'field7': Api.store('oneSignalId')
		};
		if (state === 1) {
			window.OneSignal.push(["setSubscription", true]);
			trackevent.event = 'SETTINGS_OPT_IN';
		} else {
			window.OneSignal.push(["setSubscription", false]);
			trackevent.event = 'SETTINGS_OPT_OUT';
		}
		trackingPixel.capture(trackevent);
	};


	// Only show to participating devices
	config.init.then(function(){

		// Only show if notifications enabled
		window.OneSignal.push(["isPushNotificationsEnabled", function(enabled) {
			if (enabled) {
				$scope.pushSubscribed = 1;
				$scope.pushEnabled = true;
			} else {
				window.OneSignal.getSubscription().then(function(notUnsubscribed) {
					if (!notUnsubscribed) {
						$scope.pushSubscribed = 0;
						$scope.pushEnabled = true;
					}
				});
			}
		}]);

	});

	$scope.resetStreamKey = function() {
		Api.post('channel/resetStreamKey', {
			userId: $scope.onbehalf.userId,
			channelId: $scope.onbehalf.userId
		}).success(function(data) {
			if (!data.errorCode) {
				$scope.settings.directStreaming.stream = data.streamKey;
			} else {
				Api.showError(data);
			}
		});
	};


	// Build alphabetically sorted locale list from config
	$scope.locale = [];
	angular.forEach(config.settings.Locales, function(locale, code) {
		var loco = {
			code: locale.loc[0],
			name: locale.name
		};
		if (!loco.code) {
			if (loco.name == 'English') {
				loco.code = 'en';
			}
			if (loco.name == 'Worldwide') {
				loco.code = 'ww';
			}
		}
		$scope.locale.push(loco);
	});
	$scope.locale.sort(function(a, b) {
		return a.name === b.name ? 0 : a.name > b.name ? 1 : -1;
	});
	$scope.locale.unshift({
		code: "placeholder",
		name: "Please Select"
	});

	$scope.state = [{
		code: "placeholder",
		name: "Please Select"
	}, {
		code: "",
		name: ""
	}, {
		code: "AL",
		name: "Alabama"
	}, {
		code: "AK",
		name: "Alaska"
	}, {
		code: "AZ",
		name: "Arizona"
	}, {
		code: "AR",
		name: "Arkansas"
	}, {
		code: "CA",
		name: "California"
	}, {
		code: "CO",
		name: "Colorado"
	}, {
		code: "CT",
		name: "Connecticut"
	}, {
		code: "DE",
		name: "Delaware"
	}, {
		code: "DC",
		name: "District of Columbia"
	}, {
		code: "FL",
		name: "Florida"
	}, {
		code: "GA",
		name: "Georgia"
	}, {
		code: "HI",
		name: "Hawaii"
	}, {
		code: "ID",
		name: "Idaho"
	}, {
		code: "IL",
		name: "Illinois"
	}, {
		code: "IN",
		name: "Indiana"
	}, {
		code: "IA",
		name: "Iowa"
	}, {
		code: "KS",
		name: "Kansas"
	}, {
		code: "KY",
		name: "Kentucky"
	}, {
		code: "LA",
		name: "Louisiana"
	}, {
		code: "ME",
		name: "Maine"
	}, {
		code: "MD",
		name: "Maryland"
	}, {
		code: "MA",
		name: "Massachusetts"
	}, {
		code: "MI",
		name: "Michigan"
	}, {
		code: "MN",
		name: "Minnesota"
	}, {
		code: "MS",
		name: "Mississippi"
	}, {
		code: "MO",
		name: "Missouri"
	}, {
		code: "MT",
		name: "Montana"
	}, {
		code: "NE",
		name: "Nebraska"
	}, {
		code: "NV",
		name: "Nevada"
	}, {
		code: "NH",
		name: "New Hampshire"
	}, {
		code: "NJ",
		name: "New Jersey"
	}, {
		code: "NM",
		name: "New Mexico"
	}, {
		code: "NY",
		name: "New York"
	}, {
		code: "NC",
		name: "North Carolina"
	}, {
		code: "ND",
		name: "North Dakota"
	}, {
		code: "OH",
		name: "Ohio"
	}, {
		code: "OK",
		name: "Oklahoma"
	}, {
		code: "OR",
		name: "Oregon"
	}, {
		code: "PA",
		name: "Pennsylvania"
	}, {
		code: "RI",
		name: "Rhode Island"
	}, {
		code: "SC",
		name: "South Carolina"
	}, {
		code: "SD",
		name: "South Dakota"
	}, {
		code: "TN",
		name: "Tennessee"
	}, {
		code: "TX",
		name: "Texas"
	}, {
		code: "UT",
		name: "Utah"
	}, {
		code: "VT",
		name: "Vermont"
	}, {
		code: "VA",
		name: "Virginia"
	}, {
		code: "WA",
		name: "Washington"
	}, {
		code: "WV",
		name: "West Virginia"
	}, {
		code: "WI",
		name: "Wisconsin"
	}, {
		code: "WY",
		name: "Wyoming"
	}];

	$scope.country = [{
		code: "placeholder",
		name: "Please Select"
	}, {
		code: "AF",
		name: "Afghanistan"
	}, {
		code: "AX",
		name: "Aland Islands"
	}, {
		code: "AL",
		name: "Albania"
	}, {
		code: "DZ",
		name: "Algeria"
	}, {
		code: "AS",
		name: "American Samoa"
	}, {
		code: "AD",
		name: "Andorra"
	}, {
		code: "AO",
		name: "Angola"
	}, {
		code: "AI",
		name: "Anguilla"
	}, {
		code: "AQ",
		name: "Antarctica"
	}, {
		code: "AG",
		name: "Antigua and Barbuda"
	}, {
		code: "AR",
		name: "Argentina"
	}, {
		code: "AM",
		name: "Armenia"
	}, {
		code: "AW",
		name: "Aruba"
	}, {
		code: "AU",
		name: "Australia"
	}, {
		code: "AT",
		name: "Austria"
	}, {
		code: "AZ",
		name: "Azerbaijan"
	}, {
		code: "BS",
		name: "Bahamas"
	}, {
		code: "BH",
		name: "Bahrain"
	}, {
		code: "BD",
		name: "Bangladesh"
	}, {
		code: "BB",
		name: "Barbados"
	}, {
		code: "BY",
		name: "Belarus"
	}, {
		code: "BE",
		name: "Belgium"
	}, {
		code: "BZ",
		name: "Belize"
	}, {
		code: "BJ",
		name: "Benin"
	}, {
		code: "BM",
		name: "Bermuda"
	}, {
		code: "BT",
		name: "Bhutan"
	}, {
		code: "BO",
		name: "Bolivia"
	}, {
		code: "BA",
		name: "Bosnia and Herzegovina"
	}, {
		code: "BW",
		name: "Botswana"
	}, {
		code: "BV",
		name: "Bouvet Island"
	}, {
		code: "BR",
		name: "Brazil"
	}, {
		code: "IO",
		name: "British Indian Ocean Territory"
	}, {
		code: "BN",
		name: "Brunei Darussalam"
	}, {
		code: "BG",
		name: "Bulgaria"
	}, {
		code: "BF",
		name: "Burkina Faso"
	}, {
		code: "BI",
		name: "Burundi"
	}, {
		code: "KH",
		name: "Cambodia"
	}, {
		code: "CM",
		name: "Cameroon"
	}, {
		code: "CA",
		name: "Canada"
	}, {
		code: "CV",
		name: "Cape Verde"
	}, {
		code: "KY",
		name: "Cayman Islands"
	}, {
		code: "CF",
		name: "Central African Republic"
	}, {
		code: "TD",
		name: "Chad"
	}, {
		code: "CL",
		name: "Chile"
	}, {
		code: "CN",
		name: "China"
	}, {
		code: "CX",
		name: "Christmas Island"
	}, {
		code: "CC",
		name: "Cocos (Keeling) Islands"
	}, {
		code: "CO",
		name: "Colombia"
	}, {
		code: "KM",
		name: "Comoros"
	}, {
		code: "CG",
		name: "Congo"
	}, {
		code: "CD",
		name: "Congo, The Democratic Republic of the"
	}, {
		code: "CK",
		name: "Cook Islands"
	}, {
		code: "CR",
		name: "Costa Rica"
	}, {
		code: "HR",
		name: "Croatia"
	}, {
		code: "CU",
		name: "Cuba"
	}, {
		code: "CY",
		name: "Cyprus"
	}, {
		code: "CZ",
		name: "Czech Republic"
	}, {
		code: "DK",
		name: "Denmark"
	}, {
		code: "DJ",
		name: "Djibouti"
	}, {
		code: "DM",
		name: "Dominica"
	}, {
		code: "DO",
		name: "Dominican Republic"
	}, {
		code: "EC",
		name: "Ecuador"
	}, {
		code: "EG",
		name: "Egypt"
	}, {
		code: "SV",
		name: "El Salvador"
	}, {
		code: "GQ",
		name: "Equatorial Guinea"
	}, {
		code: "ER",
		name: "Eritrea"
	}, {
		code: "EE",
		name: "Estonia"
	}, {
		code: "ET",
		name: "Ethiopia"
	}, {
		code: "FK",
		name: "Falkland Islands (Malvinas)"
	}, {
		code: "FO",
		name: "Faroe Islands"
	}, {
		code: "FJ",
		name: "Fiji"
	}, {
		code: "FI",
		name: "Finland"
	}, {
		code: "FR",
		name: "France"
	}, {
		code: "GF",
		name: "French Guiana"
	}, {
		code: "PF",
		name: "French Polynesia"
	}, {
		code: "TF",
		name: "French Southern Territories"
	}, {
		code: "GA",
		name: "Gabon"
	}, {
		code: "GM",
		name: "Gambia"
	}, {
		code: "GE",
		name: "Georgia"
	}, {
		code: "DE",
		name: "Germany"
	}, {
		code: "GH",
		name: "Ghana"
	}, {
		code: "GI",
		name: "Gibraltar"
	}, {
		code: "GR",
		name: "Greece"
	}, {
		code: "GL",
		name: "Greenland"
	}, {
		code: "GD",
		name: "Grenada"
	}, {
		code: "GP",
		name: "Guadeloupe"
	}, {
		code: "GU",
		name: "Guam"
	}, {
		code: "GT",
		name: "Guatemala"
	}, {
		code: "GG",
		name: "Guernsey"
	}, {
		code: "GN",
		name: "Guinea"
	}, {
		code: "GW",
		name: "Guinea-Bissau"
	}, {
		code: "GY",
		name: "Guyana"
	}, {
		code: "HT",
		name: "Haiti"
	}, {
		code: "HM",
		name: "Heard Island and McDonald Islands"
	}, {
		code: "VA",
		name: "Holy See (Vatican City State)"
	}, {
		code: "HN",
		name: "Honduras"
	}, {
		code: "HK",
		name: "Hong Kong"
	}, {
		code: "HU",
		name: "Hungary"
	}, {
		code: "IS",
		name: "Iceland"
	}, {
		code: "IN",
		name: "India"
	}, {
		code: "ID",
		name: "Indonesia"
	}, {
		code: "IR",
		name: "Iran, Islamic Republic of"
	}, {
		code: "IQ",
		name: "Iraq"
	}, {
		code: "IE",
		name: "Ireland"
	}, {
		code: "IM",
		name: "Isle of Man"
	}, {
		code: "IL",
		name: "Israel"
	}, {
		code: "IT",
		name: "Italy"
	}, {
		code: "CI",
		name: "Ivory Coast"
	}, {
		code: "JM",
		name: "Jamaica"
	}, {
		code: "JP",
		name: "Japan"
	}, {
		code: "JE",
		name: "Jersey"
	}, {
		code: "JO",
		name: "Jordan"
	}, {
		code: "KZ",
		name: "Kazakhstan"
	}, {
		code: "KE",
		name: "Kenya"
	}, {
		code: "KI",
		name: "Kiribati"
	}, {
		code: "KP",
		name: "Korea, Democratic People's Republic of"
	}, {
		code: "KR",
		name: "Korea, Republic of"
	}, {
		code: "KW",
		name: "Kuwait"
	}, {
		code: "KG",
		name: "Kyrgyzstan"
	}, {
		code: "LA",
		name: "Lao People's Democratic Republic"
	}, {
		code: "LV",
		name: "Latvia"
	}, {
		code: "LB",
		name: "Lebanon"
	}, {
		code: "LS",
		name: "Lesotho"
	}, {
		code: "LR",
		name: "Liberia"
	}, {
		code: "LY",
		name: "Libyan Arab Jamahiriya"
	}, {
		code: "LI",
		name: "Liechtenstein"
	}, {
		code: "LT",
		name: "Lithuania"
	}, {
		code: "LU",
		name: "Luxembourg"
	}, {
		code: "MO",
		name: "Macao"
	}, {
		code: "MK",
		name: "Macedonia, The Former Yugoslav Republic of"
	}, {
		code: "MG",
		name: "Madagascar"
	}, {
		code: "MW",
		name: "Malawi"
	}, {
		code: "MY",
		name: "Malaysia"
	}, {
		code: "MV",
		name: "Maldives"
	}, {
		code: "ML",
		name: "Mali"
	}, {
		code: "MT",
		name: "Malta"
	}, {
		code: "MH",
		name: "Marshall Islands"
	}, {
		code: "MQ",
		name: "Martinique"
	}, {
		code: "MR",
		name: "Mauritania"
	}, {
		code: "MU",
		name: "Mauritius"
	}, {
		code: "YT",
		name: "Mayotte"
	}, {
		code: "MX",
		name: "Mexico"
	}, {
		code: "FM",
		name: "Micronesia, Federated States of"
	}, {
		code: "MD",
		name: "Moldova, Republic of"
	}, {
		code: "MC",
		name: "Monaco"
	}, {
		code: "MN",
		name: "Mongolia"
	}, {
		code: "ME",
		name: "Montenegro"
	}, {
		code: "MS",
		name: "Montserrat"
	}, {
		code: "MA",
		name: "Morocco"
	}, {
		code: "MZ",
		name: "Mozambique"
	}, {
		code: "MM",
		name: "Myanmar"
	}, {
		code: "NA",
		name: "Namibia"
	}, {
		code: "NR",
		name: "Nauru"
	}, {
		code: "NP",
		name: "Nepal"
	}, {
		code: "NL",
		name: "Netherlands"
	}, {
		code: "AN",
		name: "Netherlands Antilles"
	}, {
		code: "NC",
		name: "New Caledonia"
	}, {
		code: "NZ",
		name: "New Zealand"
	}, {
		code: "NI",
		name: "Nicaragua"
	}, {
		code: "NE",
		name: "Niger"
	}, {
		code: "NG",
		name: "Nigeria"
	}, {
		code: "NU",
		name: "Niue"
	}, {
		code: "NF",
		name: "Norfolk Island"
	}, {
		code: "MP",
		name: "Northern Mariana Islands"
	}, {
		code: "NO",
		name: "Norway"
	}, {
		code: "OM",
		name: "Oman"
	}, {
		code: "PK",
		name: "Pakistan"
	}, {
		code: "PW",
		name: "Palau"
	}, {
		code: "PS",
		name: "Palestinian Territory, Occupied"
	}, {
		code: "PA",
		name: "Panama"
	}, {
		code: "PG",
		name: "Papua New Guinea"
	}, {
		code: "PY",
		name: "Paraguay"
	}, {
		code: "PE",
		name: "Peru"
	}, {
		code: "PH",
		name: "Philippines"
	}, {
		code: "PN",
		name: "Pitcairn"
	}, {
		code: "PL",
		name: "Poland"
	}, {
		code: "PT",
		name: "Portugal"
	}, {
		code: "PR",
		name: "Puerto Rico"
	}, {
		code: "QA",
		name: "Qatar"
	}, {
		code: "RE",
		name: "Reunion"
	}, {
		code: "RO",
		name: "Romania"
	}, {
		code: "RU",
		name: "Russian Federation"
	}, {
		code: "RW",
		name: "Rwanda"
	}, {
		code: "BL",
		name: "Saint Barth"
	}, {
		code: "SH",
		name: "Saint Helena"
	}, {
		code: "KN",
		name: "Saint Kitts and Nevis"
	}, {
		code: "LC",
		name: "Saint Lucia"
	}, {
		code: "MF",
		name: "Saint Martin"
	}, {
		code: "PM",
		name: "Saint Pierre and Miquelon"
	}, {
		code: "VC",
		name: "Saint Vincent and the Grenadines"
	}, {
		code: "WS",
		name: "Samoa"
	}, {
		code: "SM",
		name: "San Marino"
	}, {
		code: "ST",
		name: "Sao Tome and Principe"
	}, {
		code: "SA",
		name: "Saudi Arabia"
	}, {
		code: "SN",
		name: "Senegal"
	}, {
		code: "RS",
		name: "Serbia"
	}, {
		code: "SC",
		name: "Seychelles"
	}, {
		code: "SL",
		name: "Sierra Leone"
	}, {
		code: "SG",
		name: "Singapore"
	}, {
		code: "SK",
		name: "Slovakia"
	}, {
		code: "SI",
		name: "Slovenia"
	}, {
		code: "SB",
		name: "Solomon Islands"
	}, {
		code: "SO",
		name: "Somalia"
	}, {
		code: "ZA",
		name: "South Africa"
	}, {
		code: "GS",
		name: "South Georgia and the South Sandwich Islands"
	}, {
		code: "ES",
		name: "Spain"
	}, {
		code: "LK",
		name: "Sri Lanka"
	}, {
		code: "SD",
		name: "Sudan"
	}, {
		code: "SR",
		name: "Suriname"
	}, {
		code: "SJ",
		name: "Svalbard and Jan Mayen"
	}, {
		code: "SZ",
		name: "Swaziland"
	}, {
		code: "SE",
		name: "Sweden"
	}, {
		code: "CH",
		name: "Switzerland"
	}, {
		code: "SY",
		name: "Syrian Arab Republic"
	}, {
		code: "TW",
		name: "Taiwan"
	}, {
		code: "TJ",
		name: "Tajikistan"
	}, {
		code: "TZ",
		name: "Tanzania, United Republic of"
	}, {
		code: "TH",
		name: "Thailand"
	}, {
		code: "TL",
		name: "Timor-Leste"
	}, {
		code: "TG",
		name: "Togo"
	}, {
		code: "TK",
		name: "Tokelau"
	}, {
		code: "TO",
		name: "Tonga"
	}, {
		code: "TT",
		name: "Trinidad and Tobago"
	}, {
		code: "TN",
		name: "Tunisia"
	}, {
		code: "TR",
		name: "Turkey"
	}, {
		code: "TM",
		name: "Turkmenistan"
	}, {
		code: "TC",
		name: "Turks and Caicos Islands"
	}, {
		code: "TV",
		name: "Tuvalu"
	}, {
		code: "UG",
		name: "Uganda"
	}, {
		code: "UA",
		name: "Ukraine"
	}, {
		code: "AE",
		name: "United Arab Emirates"
	}, {
		code: "GB",
		name: "United Kingdom"
	}, {
		code: "US",
		name: "United States"
	}, {
		code: "UM",
		name: "United States Minor Outlying Islands"
	}, {
		code: "UY",
		name: "Uruguay"
	}, {
		code: "UZ",
		name: "Uzbekistan"
	}, {
		code: "VU",
		name: "Vanuatu"
	}, {
		code: "VE",
		name: "Venezuela"
	}, {
		code: "VN",
		name: "Viet Nam"
	}, {
		code: "VG",
		name: "Virgin Islands, British"
	}, {
		code: "VI",
		name: "Virgin Islands, U.S."
	}, {
		code: "WF",
		name: "Wallis And Futuna"
	}, {
		code: "EH",
		name: "Western Sahara"
	}, {
		code: "YE",
		name: "Yemen"
	}, {
		code: "ZM",
		name: "Zambia"
	}, {
		code: "ZW",
		name: "Zimbabwe"
	}];

	$scope.tshirt = [{
		code: "placeholder",
		name: "Select a size..."
	}, {
		code: "s",
		name: "Small"
	}, {
		code: "m",
		name: "Medium"
	}, {
		code: "l",
		name: "Large"
	}, {
		code: "xl",
		name: "X-Large"
	}];

	$scope.gender = [{
		code: "placeholder",
		name: "Select a gender..."
	}, {
		code: "male",
		name: "Male"
	}, {
		code: "female",
		name: "Female"
	}];

	$scope.youtubePrivacy = [{
		code: "unlisted",
		name: "Unlisted"
	}, {
		code: "public",
		name: "Public"
	}, {
		code: "private",
		name: "Private"
	}];

	// For each select array, create an object to lookup by code
	var selects = ['locale', 'state', 'country', 'gender', 'tshirt', 'youtubePrivacy'];
	$scope.select = {};
	angular.forEach(selects, function(select) {
		$scope.select[select] = {};
		angular.forEach($scope[select], function(option) {
			$scope.select[select][option.code] = option.name;
		});
	});


}])

.directive('ynValid', ['Api', '$compile', 'eventbus', function(Api, $compile, eventbus) {
	return {
		restrict: 'A',
		scope: {
			message: '@',
			isValid: '=' //should be a variable or an expression
		},
		link: function(scope, elem, attrs) {
			var tag = elem[0].tagName;

			function errorFeedback() {
				if (elem[0].className.indexOf('ng-invalid') !== -1) {
					Api.triggerTooltip(elem, 2500);
				}
			}
			if (tag == 'TEXTAREA' || tag == 'INPUT') {
				elem.on('blur', errorFeedback);
			}
			eventbus.subscribe('settings:invalid', errorFeedback, attrs.name, scope);
		}
	};
}])

;
