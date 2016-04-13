angular.module('younow.services.config', ['pascalprecht.translate'])

.provider('config', function($translateProvider) {
	var config = {};

	var readCookie =
		config.readCookie = function readCookie(what) {
			var read;
			try {
				read = window.localStorage.getItem(what);
			} catch (e) {
				read = window.readCookie(what);
			}
			return read;
		};

	var saveCookie =
		config.saveCookie = function(what, value) {
			try {
				window.localStorage.setItem(what, value);
			} catch (e) {
				window.createCookie(what, value, 3650000);
			}
		};

	// Get paramaters from the URL
	if(window.location.search) {
		try {
			config.params = JSON.parse('{"' + decodeURI(window.location.search.substring(1).replace(/&/g, "\",\"").replace(/=/g, "\":\"")) + '"}');
		} catch(e) {
			config.params = window.location.search;
		}
	} else {
		config.params = '';
	}
	config.host = config.params.host || window.location.host;

	config.buybarsiframe = false; //TURNS ON THE IFRAME BUYBARS MODAL

	// Hardcoded
	config.bootstrap = {
		adminRoles: [1, 2, 3],
		modRoles: [1, 2, 3, 4, 5],
		cdnDev: "cdnv2-vd.younow.com",
		cdnProduction: "cdn2.younow.com",
		facebookAppId: 171373592926306,
		flashVersion: "47.35",
		googleClientId: "619368150599-2ef6s6o5dqgv6oqoq5tevtqo1k7gni12.apps.googleusercontent.com",
		googleAnalyticsId: "UA-24148895-1",
		jwplayerKey: "gyoz1D2yoy+GG57wtwrgni10vNZ0+43mBkBYhw==",
		TM_DOMAIN: "images1.younow.com",
		TM_ID: "7jnw4jh4",
		supportsCanvasStream: document.createElement("canvas") && document.createElement("canvas").captureStream !== undefined ? true : false
	};

	// Get latest config data
	this.update = function() {
		config.settings = window.bootstrapConfig;
		var cdn = config.host;
		if (config.host === 'www.younow.com') {
			cdn = config.bootstrap.cdnProduction;
		}
		if (config.host === 'www2-vd.younow.com') {
			cdn = config.bootstrap.cdnDev;
		}
		var host = config.params.host ? config.params.host : cdn;
		var url = window.location.protocol + "//" + host + "/php/api/younow/config";
		if (config.host !== 'www.younow.com') {
			url += "/devByPass=1";
		}

		window.YouNow.loadingTime.startYounowConfig = Date.now();
		window.YouNow.loadingTime.younowConfig = Date.now() - window.YouNow.loadingTime.startYounowConfig;

		if (window.bootstrapConfig.redirect) {
			window.location.href = window.bootstrapConfig.redirect;
		} else {
			//adjust the api base to be https if it was requested as https
			if (window.location.protocol === 'https:' && window.bootstrapConfig.ServerCDNBaseUrl.indexOf('https') === -1) {
				config.settings.ServerCDNBaseUrl = window.bootstrapConfig.ServerCDNBaseUrl.replace("http", "https");
			}
			if (window.location.protocol === 'https:' && window.bootstrapConfig.ServerLocalBaseUrl.indexOf('https') === -1) {
				config.settings.ServerLocalBaseUrl = window.bootstrapConfig.ServerLocalBaseUrl.replace("http", "https");
			}
			if (window.location.protocol === 'https:' && window.bootstrapConfig.ServerRecommendationsBaseUrl.indexOf('https') === -1) {
				config.settings.ServerRecommendationsBaseUrl = window.bootstrapConfig.ServerRecommendationsBaseUrl.replace("http", "https");
			}
			if (window.location.protocol === 'https:' && window.bootstrapConfig.TrackingHost.indexOf('https') === -1) {
				config.settings.TrackingHost = window.bootstrapConfig.TrackingHost.replace("http", "https");
			}
			if (window.location.protocol === 'https:' && window.bootstrapConfig.PlayDataBaseUrl.indexOf('https') === -1) {
				config.settings.PlayDataBaseUrl = window.bootstrapConfig.PlayDataBaseUrl.replace("http", "https");
			}
			if (window.location.protocol === 'https:' && window.bootstrapConfig.ServerHomeBaseUrl.indexOf('https') === -1) {
				config.settings.ServerHomeBaseUrl = window.bootstrapConfig.ServerHomeBaseUrl.replace("http", "https");
			}
			if (window.location.protocol === 'https:' && window.bootstrapConfig.BadgeBaseUrl.indexOf('https') === -1) {
				config.settings.BadgeBaseUrl = window.bootstrapConfig.BadgeBaseUrl.replace("http", "https");
			}
			if (window.location.protocol === 'https:' && window.globalVars.CDN_BASE_URL.indexOf('https') === -1) {
				window.globalVars.CDN_BASE_URL = window.globalVars.CDN_BASE_URL.replace("http", "https");
			}

			// Localize
			var languages = window.navigator.languages || [window.navigator.language || window.navigator.userLanguage];
			var k, key, la, ourLa; // for jshint

			// Localize: Locale
			config.UILocales = {};
			for (la in window.bootstrapConfig.Locales) {
				config.UILocales[la] = window.bootstrapConfig.Locales[la].name;
			}

			// // from url
			// // save for later, maybe, currently parsing $stateParams in home.js
			// var ul = window.location.pathname.split('/')[1];
			// if (ul) {
			// 	if (window.YouNow.UILocalesRegex.indexOf('/' + ul) !== -1) {
			// 		window.YouNow.URLLocale = ul;
			// 		config.UILocale = ul;
			// 		$translate.use(config.UILanguage);
			// 	}
			// }

			// from settings
			config.UILocale = readCookie('UILocale');

			// from browser
			if (!config.UILocale) {
				LocaleIsLoop: for (k in languages) {
					la = languages[k];
					// if (la == 'ar') {
					// 	la = 'me';
					// }
					for (ourLa in config.UILocales) {
						if (ourLa == la) {
							config.UILocale = ourLa;
							saveCookie('UILocale', config.UILocale);
							break LocaleIsLoop;
						}
					}
				}
			}
			// indexOf
			if (!config.UILocale) {
				LocaleEqLoop: for (k in languages) {
					la = languages[k];
					// if (la == 'ar') {
					// 	la = 'me';
					// }
					for (ourLa in config.UILocales) {
						if (ourLa.indexOf(la) != -1) {
							config.UILocale = ourLa;
							saveCookie('UILocale', config.UILocale);
							break LocaleEqLoop;
						}
					}
				}
			}
			// default
			if (!config.UILocale) {
				config.UILocale = 'en';
				saveCookie('UILocale', config.UILocale);
			}

			// set language - preset in app.js
			config.UILocales = window.YouNow.UILocales;
			config.UILanguages = window.YouNow.UILanguages;

			// process
			if (!config.UILanguage) {
				config.UILanguage = readCookie('UILanguage');
				if (config.UILanguage) {
					// ok
					$translateProvider.use(config.UILanguage);
				} else {
					// ==
					if (!config.UILanguage) {
						LangIsLoop: for (k in languages) {
							la = languages[k];
							for (ourLa in config.UILanguages) {
								if (ourLa == la) {
									config.UILanguage = ourLa;
									$translateProvider.use(config.UILanguage);
									break LangIsLoop;
								}
							}
						}
					}
					// indexOf
					if (!config.UILanguage) {
						LangEqLoop: for (k in languages) {
							la = languages[k];
							for (ourLa in config.UILanguages) {
								if (ourLa.indexOf(la) != -1) {
									config.UILanguage = ourLa;
									$translateProvider.use(config.UILanguage);
									break LangEqLoop;
								}
							}
						}
					}
					// default
					if (!config.UILanguage) {
						config.UILanguage = 'en';
						saveCookie('UILanguage', config.UILanguage);
					}
				}

				// Locale: original (before user changed their browser settings)
				var broLanguage = (window.navigator.language || window.navigator.browserLanguage || window.navigator.systemLanguage || window.navigator.userLanguage).substr(0, 2);
				for (key in config.UILocales) {
					if (broLanguage == key || broLanguage.indexOf(key) != -1) {
						config.UILangOrig = key;
						break;
					}
				}
				if (!config.UILangOrig) {
					config.UILangOrig = 'en';
				}
			}

		}
	};

	this.$get = function($translate) {

		config.checkRole = function(user, roles) {
			for (var i = 0; i < roles.length; i++) {
				if (user && user.role === roles[i]) {
					return true;
				}
			}
			return false;
		};

		// Language
		config.setLanguage = function(la) {
			if (!la) {
				return false;
			}
			if (la=='ww') {
				la = 'en';
			}
			config.UILanguage = la;
			$translate.use(la);
			saveCookie('UILanguage', la);
			config.UILanguageOriginal = '';
			config.hrefLanguage = '';
		};

		config.setLocale = function(la) {
			if (!la) {
				return false;
			}
			config.UILocale = la;
			saveCookie('UILocale', la);
			config.UILocaleOriginal = '';
		};

		// Temporary
		config.setTempLanguage = function(la) {
			if (!la) {
				return false;
			}
			if (readCookie('UILanguage') || la == config.UILanguage) {
				return false;
			}
			// backup
			config.UILanguageOriginal = config.UILanguage;
			config.UILocaleOriginal = config.UILocale;
			// set
			if (la!='ww') {
				$translate.use( la );
				config.UILanguage = la;
				config.hrefLanguage = config.UILanguage;
			}
			config.UILocale = window.YouNow.UILocales[ la ] ? la : 'ww';
		};

		// Locale
		config.resetTempLanguage = function() {
			if (!config.UILanguageOriginal || config.UILanguageOriginal == config.UILanguage) {
				return false;
			}
			// re set
			$translate.use(config.UILanguageOriginal);
			config.UILanguage = config.UILanguageOriginal;
			config.UILocale = config.UILocaleOriginal;
			// delete backup
			config.UILanguageOriginal = '';
			config.UILocaleOriginal = '';
			config.hrefLanguage = '';
		};

		return config;
	};
})

;
