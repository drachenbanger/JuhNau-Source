// UA Parser!
(function(window,undefined){"use strict";var LIBVERSION="0.7.10",EMPTY="",UNKNOWN="?",FUNC_TYPE="function",UNDEF_TYPE="undefined",OBJ_TYPE="object",STR_TYPE="string",MAJOR="major",MODEL="model",NAME="name",TYPE="type",VENDOR="vendor",VERSION="version",ARCHITECTURE="architecture",CONSOLE="console",MOBILE="mobile",TABLET="tablet",SMARTTV="smarttv",WEARABLE="wearable",EMBEDDED="embedded";var util={extend:function(regexes,extensions){var margedRegexes={};for(var i in regexes){if(extensions[i]&&extensions[i].length%2===0){margedRegexes[i]=extensions[i].concat(regexes[i])}else{margedRegexes[i]=regexes[i]}}return margedRegexes},has:function(str1,str2){if(typeof str1==="string"){return str2.toLowerCase().indexOf(str1.toLowerCase())!==-1}else{return false}},lowerize:function(str){return str.toLowerCase()},major:function(version){return typeof version===STR_TYPE?version.split(".")[0]:undefined}};var mapper={rgx:function(){var result,i=0,j,k,p,q,matches,match,args=arguments;while(i<args.length&&!matches){var regex=args[i],props=args[i+1];if(typeof result===UNDEF_TYPE){result={};for(p in props){if(props.hasOwnProperty(p)){q=props[p];if(typeof q===OBJ_TYPE){result[q[0]]=undefined}else{result[q]=undefined}}}}j=k=0;while(j<regex.length&&!matches){matches=regex[j++].exec(this.getUA());if(!!matches){for(p=0;p<props.length;p++){match=matches[++k];q=props[p];if(typeof q===OBJ_TYPE&&q.length>0){if(q.length==2){if(typeof q[1]==FUNC_TYPE){result[q[0]]=q[1].call(this,match)}else{result[q[0]]=q[1]}}else if(q.length==3){if(typeof q[1]===FUNC_TYPE&&!(q[1].exec&&q[1].test)){result[q[0]]=match?q[1].call(this,match,q[2]):undefined}else{result[q[0]]=match?match.replace(q[1],q[2]):undefined}}else if(q.length==4){result[q[0]]=match?q[3].call(this,match.replace(q[1],q[2])):undefined}}else{result[q]=match?match:undefined}}}}i+=2}return result},str:function(str,map){for(var i in map){if(typeof map[i]===OBJ_TYPE&&map[i].length>0){for(var j=0;j<map[i].length;j++){if(util.has(map[i][j],str)){return i===UNKNOWN?undefined:i}}}else if(util.has(map[i],str)){return i===UNKNOWN?undefined:i}}return str}};var maps={browser:{oldsafari:{version:{"1.0":"/8",1.2:"/1",1.3:"/3","2.0":"/412","2.0.2":"/416","2.0.3":"/417","2.0.4":"/419","?":"/"}}},device:{amazon:{model:{"Fire Phone":["SD","KF"]}},sprint:{model:{"Evo Shift 4G":"7373KT"},vendor:{HTC:"APA",Sprint:"Sprint"}}},os:{windows:{version:{ME:"4.90","NT 3.11":"NT3.51","NT 4.0":"NT4.0",2000:"NT 5.0",XP:["NT 5.1","NT 5.2"],Vista:"NT 6.0",7:"NT 6.1",8:"NT 6.2",8.1:"NT 6.3",10:["NT 6.4","NT 10.0"],RT:"ARM"}}}};var regexes={browser:[[/(opera\smini)\/([\w\.-]+)/i,/(opera\s[mobiletab]+).+version\/([\w\.-]+)/i,/(opera).+version\/([\w\.]+)/i,/(opera)[\/\s]+([\w\.]+)/i],[NAME,VERSION],[/(OPiOS)[\/\s]+([\w\.]+)/i],[[NAME,"Opera Mini"],VERSION],[/\s(opr)\/([\w\.]+)/i],[[NAME,"Opera"],VERSION],[/(kindle)\/([\w\.]+)/i,/(lunascape|maxthon|netfront|jasmine|blazer)[\/\s]?([\w\.]+)*/i,/(avant\s|iemobile|slim|baidu)(?:browser)?[\/\s]?([\w\.]*)/i,/(?:ms|\()(ie)\s([\w\.]+)/i,/(rekonq)\/([\w\.]+)*/i,/(chromium|flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt|iron|vivaldi|iridium|phantomjs)\/([\w\.-]+)/i],[NAME,VERSION],[/(trident).+rv[:\s]([\w\.]+).+like\sgecko/i],[[NAME,"IE"],VERSION],[/(edge)\/((\d+)?[\w\.]+)/i],[NAME,VERSION],[/(yabrowser)\/([\w\.]+)/i],[[NAME,"Yandex"],VERSION],[/(comodo_dragon)\/([\w\.]+)/i],[[NAME,/_/g," "],VERSION],[/(chrome|omniweb|arora|[tizenoka]{5}\s?browser)\/v?([\w\.]+)/i,/(qqbrowser)[\/\s]?([\w\.]+)/i],[NAME,VERSION],[/(uc\s?browser)[\/\s]?([\w\.]+)/i,/ucweb.+(ucbrowser)[\/\s]?([\w\.]+)/i,/JUC.+(ucweb)[\/\s]?([\w\.]+)/i],[[NAME,"UCBrowser"],VERSION],[/(dolfin)\/([\w\.]+)/i],[[NAME,"Dolphin"],VERSION],[/((?:android.+)crmo|crios)\/([\w\.]+)/i],[[NAME,"Chrome"],VERSION],[/XiaoMi\/MiuiBrowser\/([\w\.]+)/i],[VERSION,[NAME,"MIUI Browser"]],[/android.+version\/([\w\.]+)\s+(?:mobile\s?safari|safari)/i],[VERSION,[NAME,"Android Browser"]],[/FBAV\/([\w\.]+);/i],[VERSION,[NAME,"Facebook"]],[/fxios\/([\w\.-]+)/i],[VERSION,[NAME,"Firefox"]],[/version\/([\w\.]+).+?mobile\/\w+\s(safari)/i],[VERSION,[NAME,"Mobile Safari"]],[/version\/([\w\.]+).+?(mobile\s?safari|safari)/i],[VERSION,NAME],[/webkit.+?(mobile\s?safari|safari)(\/[\w\.]+)/i],[NAME,[VERSION,mapper.str,maps.browser.oldsafari.version]],[/(konqueror)\/([\w\.]+)/i,/(webkit|khtml)\/([\w\.]+)/i],[NAME,VERSION],[/(navigator|netscape)\/([\w\.-]+)/i],[[NAME,"Netscape"],VERSION],[/(swiftfox)/i,/(icedragon|iceweasel|camino|chimera|fennec|maemo\sbrowser|minimo|conkeror)[\/\s]?([\w\.\+]+)/i,/(firefox|seamonkey|k-meleon|icecat|iceape|firebird|phoenix)\/([\w\.-]+)/i,/(mozilla)\/([\w\.]+).+rv\:.+gecko\/\d+/i,/(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir)[\/\s]?([\w\.]+)/i,/(links)\s\(([\w\.]+)/i,/(gobrowser)\/?([\w\.]+)*/i,/(ice\s?browser)\/v?([\w\._]+)/i,/(mosaic)[\/\s]([\w\.]+)/i],[NAME,VERSION]],cpu:[[/(?:(amd|x(?:(?:86|64)[_-])?|wow|win)64)[;\)]/i],[[ARCHITECTURE,"amd64"]],[/(ia32(?=;))/i],[[ARCHITECTURE,util.lowerize]],[/((?:i[346]|x)86)[;\)]/i],[[ARCHITECTURE,"ia32"]],[/windows\s(ce|mobile);\sppc;/i],[[ARCHITECTURE,"arm"]],[/((?:ppc|powerpc)(?:64)?)(?:\smac|;|\))/i],[[ARCHITECTURE,/ower/,"",util.lowerize]],[/(sun4\w)[;\)]/i],[[ARCHITECTURE,"sparc"]],[/((?:avr32|ia64(?=;))|68k(?=\))|arm(?:64|(?=v\d+;))|(?=atmel\s)avr|(?:irix|mips|sparc)(?:64)?(?=;)|pa-risc)/i],[[ARCHITECTURE,util.lowerize]]],device:[[/\((ipad|playbook);[\w\s\);-]+(rim|apple)/i],[MODEL,VENDOR,[TYPE,TABLET]],[/applecoremedia\/[\w\.]+ \((ipad)/],[MODEL,[VENDOR,"Apple"],[TYPE,TABLET]],[/(apple\s{0,1}tv)/i],[[MODEL,"Apple TV"],[VENDOR,"Apple"]],[/(archos)\s(gamepad2?)/i,/(hp).+(touchpad)/i,/(kindle)\/([\w\.]+)/i,/\s(nook)[\w\s]+build\/(\w+)/i,/(dell)\s(strea[kpr\s\d]*[\dko])/i],[VENDOR,MODEL,[TYPE,TABLET]],[/(kf[A-z]+)\sbuild\/[\w\.]+.*silk\//i],[MODEL,[VENDOR,"Amazon"],[TYPE,TABLET]],[/(sd|kf)[0349hijorstuw]+\sbuild\/[\w\.]+.*silk\//i],[[MODEL,mapper.str,maps.device.amazon.model],[VENDOR,"Amazon"],[TYPE,MOBILE]],[/\((ip[honed|\s\w*]+);.+(apple)/i],[MODEL,VENDOR,[TYPE,MOBILE]],[/\((ip[honed|\s\w*]+);/i],[MODEL,[VENDOR,"Apple"],[TYPE,MOBILE]],[/(blackberry)[\s-]?(\w+)/i,/(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|huawei|meizu|motorola|polytron)[\s_-]?([\w-]+)*/i,/(hp)\s([\w\s]+\w)/i,/(asus)-?(\w+)/i],[VENDOR,MODEL,[TYPE,MOBILE]],[/\(bb10;\s(\w+)/i],[MODEL,[VENDOR,"BlackBerry"],[TYPE,MOBILE]],[/android.+(transfo[prime\s]{4,10}\s\w+|eeepc|slider\s\w+|nexus 7)/i],[MODEL,[VENDOR,"Asus"],[TYPE,TABLET]],[/(sony)\s(tablet\s[ps])\sbuild\//i,/(sony)?(?:sgp.+)\sbuild\//i],[[VENDOR,"Sony"],[MODEL,"Xperia Tablet"],[TYPE,TABLET]],[/(?:sony)?(?:(?:(?:c|d)\d{4})|(?:so[-l].+))\sbuild\//i],[[VENDOR,"Sony"],[MODEL,"Xperia Phone"],[TYPE,MOBILE]],[/\s(ouya)\s/i,/(nintendo)\s([wids3u]+)/i],[VENDOR,MODEL,[TYPE,CONSOLE]],[/android.+;\s(shield)\sbuild/i],[MODEL,[VENDOR,"Nvidia"],[TYPE,CONSOLE]],[/(playstation\s[34portablevi]+)/i],[MODEL,[VENDOR,"Sony"],[TYPE,CONSOLE]],[/(sprint\s(\w+))/i],[[VENDOR,mapper.str,maps.device.sprint.vendor],[MODEL,mapper.str,maps.device.sprint.model],[TYPE,MOBILE]],[/(lenovo)\s?(S(?:5000|6000)+(?:[-][\w+]))/i],[VENDOR,MODEL,[TYPE,TABLET]],[/(htc)[;_\s-]+([\w\s]+(?=\))|\w+)*/i,/(zte)-(\w+)*/i,/(alcatel|geeksphone|huawei|lenovo|nexian|panasonic|(?=;\s)sony)[_\s-]?([\w-]+)*/i],[VENDOR,[MODEL,/_/g," "],[TYPE,MOBILE]],[/(nexus\s9)/i],[MODEL,[VENDOR,"HTC"],[TYPE,TABLET]],[/[\s\(;](xbox(?:\sone)?)[\s\);]/i],[MODEL,[VENDOR,"Microsoft"],[TYPE,CONSOLE]],[/(kin\.[onetw]{3})/i],[[MODEL,/\./g," "],[VENDOR,"Microsoft"],[TYPE,MOBILE]],[/\s(milestone|droid(?:[2-4x]|\s(?:bionic|x2|pro|razr))?(:?\s4g)?)[\w\s]+build\//i,/mot[\s-]?(\w+)*/i,/(XT\d{3,4}) build\//i,/(nexus\s[6])/i],[MODEL,[VENDOR,"Motorola"],[TYPE,MOBILE]],[/android.+\s(mz60\d|xoom[\s2]{0,2})\sbuild\//i],[MODEL,[VENDOR,"Motorola"],[TYPE,TABLET]],[/android.+((sch-i[89]0\d|shw-m380s|gt-p\d{4}|gt-n8000|sgh-t8[56]9|nexus 10))/i,/((SM-T\w+))/i],[[VENDOR,"Samsung"],MODEL,[TYPE,TABLET]],[/((s[cgp]h-\w+|gt-\w+|galaxy\snexus|sm-n900))/i,/(sam[sung]*)[\s-]*(\w+-?[\w-]*)*/i,/sec-((sgh\w+))/i],[[VENDOR,"Samsung"],MODEL,[TYPE,MOBILE]],[/(samsung);smarttv/i],[VENDOR,MODEL,[TYPE,SMARTTV]],[/\(dtv[\);].+(aquos)/i],[MODEL,[VENDOR,"Sharp"],[TYPE,SMARTTV]],[/sie-(\w+)*/i],[MODEL,[VENDOR,"Siemens"],[TYPE,MOBILE]],[/(maemo|nokia).*(n900|lumia\s\d+)/i,/(nokia)[\s_-]?([\w-]+)*/i],[[VENDOR,"Nokia"],MODEL,[TYPE,MOBILE]],[/android\s3\.[\s\w;-]{10}(a\d{3})/i],[MODEL,[VENDOR,"Acer"],[TYPE,TABLET]],[/android\s3\.[\s\w;-]{10}(lg?)-([06cv9]{3,4})/i],[[VENDOR,"LG"],MODEL,[TYPE,TABLET]],[/(lg) netcast\.tv/i],[VENDOR,MODEL,[TYPE,SMARTTV]],[/(nexus\s[45])/i,/lg[e;\s\/-]+(\w+)*/i],[MODEL,[VENDOR,"LG"],[TYPE,MOBILE]],[/android.+(ideatab[a-z0-9\-\s]+)/i],[MODEL,[VENDOR,"Lenovo"],[TYPE,TABLET]],[/linux;.+((jolla));/i],[VENDOR,MODEL,[TYPE,MOBILE]],[/((pebble))app\/[\d\.]+\s/i],[VENDOR,MODEL,[TYPE,WEARABLE]],[/android.+;\s(glass)\s\d/i],[MODEL,[VENDOR,"Google"],[TYPE,WEARABLE]],[/android.+(\w+)\s+build\/hm\1/i,/android.+(hm[\s\-_]*note?[\s_]*(?:\d\w)?)\s+build/i,/android.+(mi[\s\-_]*(?:one|one[\s_]plus)?[\s_]*(?:\d\w)?)\s+build/i],[[MODEL,/_/g," "],[VENDOR,"Xiaomi"],[TYPE,MOBILE]],[/\s(tablet)[;\/\s]/i,/\s(mobile)[;\/\s]/i],[[TYPE,util.lowerize],VENDOR,MODEL]],engine:[[/windows.+\sedge\/([\w\.]+)/i],[VERSION,[NAME,"EdgeHTML"]],[/(presto)\/([\w\.]+)/i,/(webkit|trident|netfront|netsurf|amaya|lynx|w3m)\/([\w\.]+)/i,/(khtml|tasman|links)[\/\s]\(?([\w\.]+)/i,/(icab)[\/\s]([23]\.[\d\.]+)/i],[NAME,VERSION],[/rv\:([\w\.]+).*(gecko)/i],[VERSION,NAME]],os:[[/microsoft\s(windows)\s(vista|xp)/i],[NAME,VERSION],[/(windows)\snt\s6\.2;\s(arm)/i,/(windows\sphone(?:\sos)*|windows\smobile|windows)[\s\/]?([ntce\d\.\s]+\w)/i],[NAME,[VERSION,mapper.str,maps.os.windows.version]],[/(win(?=3|9|n)|win\s9x\s)([nt\d\.]+)/i],[[NAME,"Windows"],[VERSION,mapper.str,maps.os.windows.version]],[/\((bb)(10);/i],[[NAME,"BlackBerry"],VERSION],[/(blackberry)\w*\/?([\w\.]+)*/i,/(tizen)[\/\s]([\w\.]+)/i,/(android|webos|palm\sos|qnx|bada|rim\stablet\sos|meego|contiki)[\/\s-]?([\w\.]+)*/i,/linux;.+(sailfish);/i],[NAME,VERSION],[/(symbian\s?os|symbos|s60(?=;))[\/\s-]?([\w\.]+)*/i],[[NAME,"Symbian"],VERSION],[/\((series40);/i],[NAME],[/mozilla.+\(mobile;.+gecko.+firefox/i],[[NAME,"Firefox OS"],VERSION],[/(nintendo|playstation)\s([wids34portablevu]+)/i,/(mint)[\/\s\(]?(\w+)*/i,/(mageia|vectorlinux)[;\s]/i,/(joli|[kxln]?ubuntu|debian|[open]*suse|gentoo|(?=\s)arch|slackware|fedora|mandriva|centos|pclinuxos|redhat|zenwalk|linpus)[\/\s-]?([\w\.-]+)*/i,/(hurd|linux)\s?([\w\.]+)*/i,/(gnu)\s?([\w\.]+)*/i],[NAME,VERSION],[/(cros)\s[\w]+\s([\w\.]+\w)/i],[[NAME,"Chromium OS"],VERSION],[/(sunos)\s?([\w\.]+\d)*/i],[[NAME,"Solaris"],VERSION],[/\s([frentopc-]{0,4}bsd|dragonfly)\s?([\w\.]+)*/i],[NAME,VERSION],[/(ip[honead]+)(?:.*os\s([\w]+)*\slike\smac|;\sopera)/i],[[NAME,"iOS"],[VERSION,/_/g,"."]],[/(mac\sos\sx)\s?([\w\s\.]+\w)*/i,/(macintosh|mac(?=_powerpc)\s)/i],[[NAME,"Mac OS"],[VERSION,/_/g,"."]],[/((?:open)?solaris)[\/\s-]?([\w\.]+)*/i,/(haiku)\s(\w+)/i,/(aix)\s((\d)(?=\.|\)|\s)[\w\.]*)*/i,/(plan\s9|minix|beos|os\/2|amigaos|morphos|risc\sos|openvms)/i,/(unix)\s?([\w\.]+)*/i],[NAME,VERSION]]};var UAParser=function(uastring,extensions){if(!(this instanceof UAParser)){return new UAParser(uastring,extensions).getResult()}var ua=uastring||(window&&window.navigator&&window.navigator.userAgent?window.navigator.userAgent:EMPTY);var rgxmap=extensions?util.extend(regexes,extensions):regexes;this.getBrowser=function(){var browser=mapper.rgx.apply(this,rgxmap.browser);browser.major=util.major(browser.version);return browser};this.getCPU=function(){return mapper.rgx.apply(this,rgxmap.cpu)};this.getDevice=function(){return mapper.rgx.apply(this,rgxmap.device)};this.getEngine=function(){return mapper.rgx.apply(this,rgxmap.engine)};this.getOS=function(){return mapper.rgx.apply(this,rgxmap.os)};this.getResult=function(){return{ua:this.getUA(),browser:this.getBrowser(),engine:this.getEngine(),os:this.getOS(),device:this.getDevice(),cpu:this.getCPU()}};this.getUA=function(){return ua};this.setUA=function(uastring){ua=uastring;return this};return this};UAParser.VERSION=LIBVERSION;UAParser.BROWSER={NAME:NAME,MAJOR:MAJOR,VERSION:VERSION};UAParser.CPU={ARCHITECTURE:ARCHITECTURE};UAParser.DEVICE={MODEL:MODEL,VENDOR:VENDOR,TYPE:TYPE,CONSOLE:CONSOLE,MOBILE:MOBILE,SMARTTV:SMARTTV,TABLET:TABLET,WEARABLE:WEARABLE,EMBEDDED:EMBEDDED};UAParser.ENGINE={NAME:NAME,VERSION:VERSION};UAParser.OS={NAME:NAME,VERSION:VERSION};if(typeof exports!==UNDEF_TYPE){if(typeof module!==UNDEF_TYPE&&module.exports){exports=module.exports=UAParser}exports.UAParser=UAParser}else{if(typeof define===FUNC_TYPE&&define.amd){define("ua-parser-js",[],function(){return UAParser})}else{window.UAParser=UAParser}}var $=window.jQuery||window.Zepto;if(typeof $!==UNDEF_TYPE){var parser=new UAParser;$.ua=parser.getResult();$.ua.get=function(){return parser.getUA()};$.ua.set=function(uastring){parser.setUA(uastring);var result=parser.getResult();for(var prop in result){$.ua[prop]=result[prop]}}}})(typeof window==="object"?window:this);

angular.module('younow.services.channel', [])

.factory('broadcasterService', function($rootScope, $http, $q, $location, $document, $window, $timeout, $state, $stateParams, $modal, config, session, Api, swf, pusher, eventbus, $interval, guestService, externalStreamer, $filter, trpx, webRtc, broadcasterServiceCore, selfies) {
	var serviceCore = new broadcasterServiceCore.Base(config);
	var service = angular.extend(serviceCore, {});

	//local variable to store the current broadcaster or channel or exploreBroadcaster
	var bc;
	var deviceMap = {
		"iPhone1,1": "iPhone",
		"iPhone1,2": "iPhone 3G",
		"iPhone2,1": "iPhone 3GS",
		"iPhone3,1": "iPhone 4 (GSM)",
		"iPhone3,3": "iPhone 4 (CDMA)",
		"iPhone4,1": "iPhone 4S",
		"iPhone5,1": "iPhone 5",
		"iPhone5,2": "iPhone 5",
		"iPhone5,3": "iPhone 5c",
		"iPhone5,4": "iPhone 5c",
		"iPhone6,1": "iPhone 5s",
		"iPhone6,2": "iPhone 5s",
		"iPhone7,1": "iPhone 6 Plus",
		"iPhone7,2": "iPhone 6",
		"iPhone8,1": "iPhone 6s",
		"iPhone8,2": "iPhone 6s Plus",
		"iPad1,1": "iPad",
		"iPad2,1": "iPad 2 (Wi-Fi)",
		"iPad2,2": "iPad 2 (GSM)",
		"iPad2,3": "iPad 2 (CDMA)",
		"iPad2,4": "iPad 2 (Wi-Fi)",
		"iPad2,5": "iPad mini (Wi-Fi)",
		"iPad2,6": "iPad mini (A1454)",
		"iPad2,7": "iPad mini (A1455)",
		"iPad3,1": "iPad (3rd gen, Wi-Fi)",
		"iPad3,2": "iPad (3rd gen, Wi-Fi+LTE Verizon)",
		"iPad3,3": "iPad (3rd gen, Wi-Fi+LTE AT&T)",
		"iPad3,4": "iPad (4th gen, Wi-Fi)",
		"iPad3,5": "iPad (4th gen, A1459)",
		"iPad3,6": "iPad (4th gen, A1460)",
		"iPad4,1": "iPad Air (Wi-Fi)",
		"iPad4,2": "iPad Air (Wi-Fi+LTE)",
		"iPad4,3": "iPad Air (Rev)",
		"iPad4,4": "iPad mini 2 (Wi-Fi)",
		"iPad4,5": "iPad mini 2 (Wi-Fi+LTE)",
		"iPad4,6": "iPad mini 2 (Rev)",
		"iPad4,7": "iPad mini 3 (Wi-Fi)",
		"iPad4,8": "iPad mini 3 (A1600)",
		"iPad4,9": "iPad mini 3 (A1601)",
		"iPad5,1": "iPad mini 4 (Wi-Fi)",
		"iPad5,2": "iPad mini 4 (Wi-Fi+LTE)",
		"iPad5,3": "iPad Air 2 (Wi-Fi)",
		"iPad5,4": "iPad Air 2 (Wi-Fi+LTE)",
		"iPad6,7": "iPad Pro (Wi-Fi)",
		"iPad6,8": "iPad Pro (Wi-Fi+LTE)",
		"iPod1,1": "iPod touch",
		"iPod2,1": "iPod touch (2nd gen)",
		"iPod3,1": "iPod touch (3rd gen)",
		"iPod4,1": "iPod touch (4th gen)",
		"iPod5,1": "iPod touch (5th gen)",
		"iPod7,1": "iPod touch (6th gen)",
		"samsung SM-G900F": "Samsung Galaxy S5",
		"samsung SM-G800F": "Samsung Galaxy S5 Mini",
		"samsung SM-G920F": "Samsung Galaxy S6",
		"samsung GT-I9500": "Samsung Galaxy S4",
		"samsung GT-I9505": "Samsung Galaxy S4",
		"samsung SM-A300FU": "Samsung Galaxy A3",
		"samsung GT-I9305": "Samsung Galaxy S3",
		"samsung GT-I9100": "Samsung Galaxy S2",
		"samsung GT-I9000": "Samsung Galaxy S1",
		"samsung GT-I8190": "Samsung Galaxy S3 mini",
		"samsung SM-G925F": "Samsung Galaxy S6 Edge",
		"samsung SM-G928F": "Samsung Galaxy S6 Edge+",
		"samsung SM-J110F": "Samsung Galaxy J1 Ace LTE",
		"motorola XT1093": "Motorola Moto X",
		"LGE LG-H343": "LG Risio",
		"ALLVIEW X2_Soul_Xtreme": "Allview X2 Soul Xtreme",
		"samsung SM-G360G": "Samsung Galaxy Core Prime",
		"Sony C6603": "Sony Xperia Z",
		"HUAWEI CHC-U01": "Huawei Honor G Play",
		"HUAWEI ALE-L02": "Huawei P8 Lite",
		"LGE LG-D373": "LG L80",
		"HUAWEI G7-L01": "Huawei Ascend G7"
	};
	
	service.setTab = function(variant) {
		service.asyncTabs = {};
		if ($stateParams.entityType) {
			service.asyncTabs.posts = true;
		} else {
			if (variant == 'A') {
				service.asyncTabs.broadcasts = true;
			}
			if (variant == 'B') {
				service.asyncTabs.posts = true;
			}
		}
	};

	service.getCurId = function() {
		var curId;
		if (service.broadcaster && service.broadcaster.userId && !service.channel) {
			curId = service.broadcaster.userId;
		} else if (service.exploreBroadcaster && service.exploreBroadcaster.userId) {
			curId = service.exploreBroadcaster.userId;
		} else if (service.channel && service.channel.channelId) {
			curId = service.channel.channelId;
		} else {
			curId = 0;
		}
		session.curId = curId;
		return curId;
	};

	service.getBroadcaster = function(id, username, async, bcMedia) {
		// Track
		service.trackBroadcaster();
		// Get the tag from the #hash if required
		if ($window.quickHash) {
			var tag = $window.quickHash.substr(1);
			$window.quickHash = '';
			return service.featuredBroadcaster(tag);
		}

		if (!id) {
			return service.featuredBroadcaster();
		}

		// Fetch user info
		var data = {};
		if (username) {
			data.user = id;
		} else {
			data.channelId = id;
		}
		data.curId = service.curId !== undefined ? service.curId : 0;
		return Api.get('broadcast/info', data)
			.success(function(data) {
				// If no user ID returned...
				if (!data.userId) {
					// If requested via username, see if it is a tag
					if (username) {
						return service.featuredBroadcaster(id);
					}
					// Otherwise, use the ID requested with
					else {
						data.userId = id;
					}
				}
				service.updateBroadcaster(data, async, bcMedia);
			});

	};

	service.trackBroadcaster = function() {
		if (service.broadcaster && service.viewtimeSeconds && !service.broadcaster.async) { // this runs before broadcaster is changed, so ignore if no previous (nothing to track), or if previous broadcast is async (profile page)
			eventbus.notifySubscribers('broadcast:end', service.broadcaster);
			//service.broadcaster.timeStarted = undefined;
			//service.viewtimeSeconds = 0; // instead reset when starting new broadcast or after tracking the ending broadcast
		}
	};

	service.switchBroadcaster = function(id, username, async) {
		service.curId = service.getCurId();
		//if it's a prerender always go to async page
		if (window.isPrerender) {
			async = true;
		}
		service.getBroadcaster(id, username, async).then(function() {
			if (service.broadcaster && service.broadcaster.userId) {
				service.showBroadcaster();
			}
		});
	};

	service.featuredBroadcaster = function(tag, noFans, goingLive) {
		// Fetch a featured broadcaster
		var data = {
			locale: config.UILocale
		};
		if (tag) {
			data.tag = tag;
		}
		if (noFans) {
			data.noFans = 1;
		}
		data.curId = service.getCurId();
		return Api.get('younow/featured', data)
			.success(function(data) {
				if (data.userId) {
					service.updateBroadcaster(data, false);
					service.showBroadcaster(goingLive);
				} else {
					// Load the blank state
					if (!tag) {
						$state.go("main.channel.detail");
						service.broadcaster = {
							broadcastId: 1
						};
					} else {
						missingUser();
						console.warn('user does not exist');
					}
				}
			});
	};

	service.getBc = function(type) {
		return bc;
	};

	service.updateBc = function(newBc) {
		if (!newBc) {
			return false;
		}
		bc = newBc;
		bc.channelSwitch = service.channelSwitch;
		return bc;
	};
	
	var fineNumber = function(val, sep)
	{
		if (sep == null)
			sep = ","
		while (/(\d+)(\d{3})/.test(val.toString())){
			val = val.toString().replace(/(\d+)(\d{3})/, '$1'+sep+'$2');
		}
		return val;
	}
	
	service.updateBroadcaster = function(data, async, bcMedia) {
		service.broadcaster = data;
		if (service.broadcaster.broadcastId)
		{
			var userAgentString = service.broadcaster.broadcasterInfo.substring(0, service.broadcaster.broadcasterInfo.indexOf("{"));
			var commaCount = (userAgentString.match(/,/g) || []).length;
			if (commaCount >= 3)
			{
				// we're dealing with a mobile device! :'3
				service.broadcaster.device = "Mobile";
				service.broadcaster.provider = userAgentString.substring(userAgentString.lastIndexOf(",") + 1); // seems empty all the time?
				var left = userAgentString.substring(0, userAgentString.lastIndexOf(","));
				service.broadcaster.osVersion = left.substring(left.lastIndexOf(",") + 1);
				var left = left.substring(0, left.lastIndexOf(","));
				service.broadcaster.provider = left.substring(left.lastIndexOf(",") + 1);
				var left = left.substring(0, left.lastIndexOf(","));
				service.broadcaster.connection = left.substring(left.lastIndexOf(",") + 1);
				service.broadcaster.deviceName = left.substring(0, left.lastIndexOf(","));
				if (deviceMap[service.broadcaster.deviceName] != null)
				{
					service.broadcaster.deviceName = deviceMap[service.broadcaster.deviceName];
				}
			}
			else 
			{
				// user agent string!
				var parser = new UAParser();
				parser.setUA(userAgentString);
				var result = parser.getResult();
				service.broadcaster.device = "Computer";
				service.broadcaster.browser = result.browser.name + " " + result.browser.version;
				service.broadcaster.os = result.os.name + " " + result.os.version;
			}
			var partnerMap = [
				"No partner", // 0
				"Partner", // 1
				"Application pending", // 2
				"Pending", // 3
				"", // 4
				"", // 5
				"Approved (confirm rules)", // 6
				"Partner (reconfirm rules)", // 7
			];
			service.broadcaster.partnerText = partnerMap[service.broadcaster.partner];
			service.broadcaster.levelPercentage = Math.floor((service.broadcaster.userlevel - Math.floor(service.broadcaster.userlevel)) * 1000) / 10;
			service.broadcaster.nextLevel = Math.floor(service.broadcaster.userlevel) + 1;
			service.broadcaster.currentLevel = Math.floor(service.broadcaster.userlevel);
			service.broadcaster.fineCoins = fineNumber(service.broadcaster.coins);
			service.broadcaster.finePoints = fineNumber(service.broadcaster.points);
			service.broadcaster.fineGiftsValue = fineNumber(service.broadcaster.giftsValue);
		}
		//BC = beforeChange = .broadcaster || .channel || .exploreBroadcaster
		eventbus.notifySubscribers('broadcaster:beforeChange', {});
		service.broadcaster = service.channelFormat(service.broadcaster);
		service.updateBc(service.broadcaster);
		trpx.updateBroadcast(data);

		// Disable chatMode... why not on broadcaster? forget, possibly because broadcaster is not ready or takes too long to switch, so need to have it always
		service.chatMode = data.chatMode || 0;

		// Check for a deeplink to a current broadcast
		if ($stateParams.entityId && service.broadcaster.broadcastId && $stateParams.entityId != "channel") {
			async = false;
		}

		// Switch to async if need be
		if (async || !service.broadcaster.broadcastId) {
			service.async = true;
		} else {
			service.async = false;
		}

		//set pageType if necessary
		if (window.waitForPageType) {
			if (!service.async || (!window.YouNow.track.pageFirst && !$stateParams.entityId && !$stateParams.entityType)) {
				window.waitForPageType = false;
				$rootScope.gaPage({
					pageType: service.async ? 'profile' : 'brdcst'
				});
			}
		}

		// if (!Api.store('hideYounowLanding')) {
		// 	if (!service.async) {
		// 		Api.showTopBanner($filter('translate')('welcome_title', {
		// 			value: data.profile
		// 		}), $filter('translate')('welcome_text', {
		// 			value: data.profile
		// 		}), $filter('translate')('welcome_button'), '/explore/', 'success', true, 'banner');
		// 		Api.store('hideYounowLanding', true);
		// 	}
		// }

		// Set the current channel id
		session.channelId = service.broadcaster.userId;


		if (service.broadcaster.user) {
			if (!service.broadcaster.user.description || service.broadcaster.user.description.length === 0) {
				service.broadcaster.user.description = Api.prepareDescription('');
			} else { //clean up descrption: Replace breaks with dots, replace double spaces with single, convert links and emojis
				service.broadcaster.user.description = Api.convertEmoji(Api.linkify(service.broadcaster.user.description.replace(/\s{2,}/g, ' ').replace(/(<br \/>)+/g, "<span class='line-break'> &#8226; </span> ")));
			}

			service.broadcaster.user.location = Api.cleanLocation(service.broadcaster.location, true);

			//add location
			if (service.broadcaster.user.location) {
				service.broadcaster.user.description = Api.trustedHTML(service.broadcaster.user.location + " <span class='line-break'> &#8226; </span> " + service.broadcaster.user.description.$$unwrapTrustedValue());
			}

			//add bcmedia node if it exists
			if (bcMedia !== undefined) {
				service.bcMedia = bcMedia;
			}
		}
		
		// Clear channel info
		if (service.async === false) {
			service.channel = undefined;
		}

		service.ready = true;

		var deferred = $q.defer();

		deferred.resolve(service.broadcaster);

		return deferred.promise;

	};

	service.showBroadcaster = function(goingLive) {
		// ASYNC (profile)
		if (service.async) {
			service.setChannel();
			return false;
		}
		// LIVE
		// track viewtime - start/reset
		service.viewtimeSeconds = 0; // 0 seconds
		// Show the Google Ad in sidebar, now that a tag is known
		// Api.loadGoogleAds(service.broadcaster.tags[0]);
		if (swf.currentSession && !swf.settingUpBroadcast && swf.currentSession.isBroadcasting) {
			// Update the player state
			session.isBroadcasting = true;
			swf.settingUpBroadcast = false;
		}
		//if starting a broadcast switch states and update BCer
		else if (swf.settingUpBroadcast) {
			swf.currentSession.isBroadcasting = true;
			guestService.newBroadcaster();
			swf.newBroadcaster(service.broadcaster, goingLive);
			selfies.newBroadcaster(service.broadcaster);
		} else {
			guestService.newBroadcaster();
			swf.newBroadcaster(service.broadcaster);
			selfies.newBroadcaster(service.broadcaster);
		}

		//check if 3rd party streamer
		// if(service.broadcaster && )

		//user is in the guestlist
		if (service.broadcaster && service.broadcaster.guestInfo) {
			guestService.newUserGuestObj(service.broadcaster.guestInfo);
		} else {
			guestService.updateUserGuestObj();
		}


		//update user guest object and state if guest exists
		if (service.broadcaster && service.broadcaster.guestBroadcaster) {
			guestService.newGuestObj(service.broadcaster.guestBroadcaster);
			if (service.broadcaster.userId == session.user.userId) {
				guestService.overlayStates.guest = 'connected';
			}
		} else {
			guestService.updateGuestObj();
		}

		//update selfie object if selfie is currently enabled by broadcaster
		if (service.broadcaster && service.broadcaster.selfie) {
			selfies.newSelfie(service.broadcaster.selfie);
		} else {
			selfies.clearSelfies();
		}

		// Update the URL (if available)
		if (service.broadcaster.profile && (service.broadcaster.profile !== $stateParams.profileUrlString || $stateParams.entityId === "channel")) {
			service.internalLocationChange(service.broadcaster.profile);
		}

		// Set Page Title
		$timeout(function() {
			if (service.broadcaster && service.broadcaster.user) {
				$rootScope.title = 'YouNow | ' + service.broadcaster.user.profileUrlString + ' | Live Stream Video Chat | Free Apps on Web, iOS and Android';
				// track
				if (window.location.pathname != '/') {
					$rootScope.gaPage({
						page: 'Broadcast'
					});
				}

			}
		}, 1000);

		if (!window.YouNow.track.pageFirst) {
			$rootScope.gaPage();
		}

		// Subscribe to Pusher
		pusher.ready().then(function() {
			pusher.subscribeToChannel(service.broadcaster.userId, service.channelSwitch, session.user.sec_token);
		});

		//remove the old playData loop and delete it from the utility looping function
		if (Api.polls.getPlayData) {
			$interval.cancel(Api.polls.getPlayData);
			delete Api.polls.getPlayData;
		}

		// Fetch play data on a loop
		getPlayData();

	};

	var getPlayData = function() {
		var method;
		// Ignore if not broadcasting (typically because user was changed during timeout)
		if (!service.broadcaster || !service.broadcaster.broadcastId) {
			return false;
		}

		if (($state.current.name !== 'main.channel.detail' || service.async) && Api.polls.getPlayData) {
			return false;
		}

		var heartbeat = {
			response: undefined,
			type: undefined
		};

		if (session.user && swf.broadcast && session.user.userId === swf.broadcast.userId) {
			heartbeat.response = swf.invokeSwfMethod('onBroadcast');
			heartbeat.type = "broadcaster";
		} else {
			heartbeat.response = swf.invokeSwfMethod('onPlayback');
			heartbeat.type = "viewer";
		}

		//check for timestamp from swf, if it errors out to NaN then we must attempt a reload
		if (heartbeat.response !== undefined && isNaN(heartbeat.response.nsTime)) {
			if (heartbeat.type === "viewer") {
				window.YouNow.App.loadChannel({
					channelId: swf.broadcast.userId
				});
			}
			if (heartbeat.type === "broadcaster") {
				swf.invokeSwfMethod('startBroadcast', service.bcMedia);
			}
			window.YouNow.App.stateChange('RECONNECT');
		} else {
			if (swf.playState === 'RECONNECT') {
				window.YouNow.App.stateChange('PLAYING');
			}
		}

		if (guestService.state === 'connected' || (session.isBroadcasting && session.user.partner == 1)) {
			webRtc.getStats();
		}
		if (service.broadcaster.tagPlayData.indexOf('https') === -1) {
			service.broadcaster.tagPlayData = service.broadcaster.tagPlayData.replace("http", "https");
		}
		config.init.then(function() {
			$http.get(service.broadcaster.tagPlayData)
				.then(function(response) {
					angular.forEach(response.data.items, function(person, key) {
						person.tooltip = '<div class="user-row"><span class="ynicon ynicon-level"></span><span class="level">' + person.userlevel + '</span> <span class="name">' + person.username + '</span></div><div class="viewer-row"><span class="ynicon ynicon-viewers"></span> <span class="viewers">' + person.viewers + '</span></div>';
						if (session.user && person.userId == session.user.userId) {
							service.broadcaster.tagRank = '#' + (key + 1);
						}
						if (person.userId == swf.broadcast.userId) {
							service.bcQueuePos = key + 1;
						}
						person.id = config.settings.UseBroadcastThumbs ? person.broadcastId : person.userId;
						person.thumb = Api.generateDynamicApi('BROADCAST_THUMB_DYNAMIC') + '/' + person.broadcastId + '/' + person.broadcastId + '.jpg';
						//person.thumb_backup = Api.generateDynamicApi('BROADCAST_THUMB') + '/' + person.broadcastId + '/' + person.broadcastId + '.jpg';
						//person.thumb = config.broadcasterThumb+person.id;
						person.thumb_backup = config.broadcasterThumb + person.id;
					});

					swf.queue = response.data.items;

					// Repeat
					if (!service.async) {
						Api.poll(getPlayData, 'getPlayData', response.data.nextRefresh);
					}
				});
			});
	};

	service.setChannel = function() {

		// end broadcast
		eventbus.notifySubscribers('broadcast:end', service.broadcaster);

		// begin ASYNC (profile page)

		service.broadcaster.async = true;
		var postData = {
			channelId: service.broadcaster.userId
		};
		var useCDN = 'usecdn';
		if (session.user && session.user.userId == service.broadcaster.userId) {
			useCDN = '';
			postData.random = Math.random();
		}
		postData.includeUserKeyWords = 1;

		Api.get('channel/getInfo', postData, useCDN).success(function(data) {
			//Show to the banner for new visitors landing on the async
			if (!Api.store('hideYounowLanding')) {
				if (service.async) {
					//Api.showTopBanner('Become a fan of ' + data.profile + ' on YouNow!', 'Fan ' + data.profile + ' and never miss a broadcast, or discover more amazing broadcasters live streaming on YouNow!', 'Explore More Broadcasters', '/explore/', 'success', true, 'banner');
					Api.store('hideYounowLanding', true);
				}
			}
			if (!data.userId) {
				missingUser();
				return true;
			}

			// Format and save the data
			data.displayDescription = Api.convertEmoji(Api.prepareDescription(data.description));
			data.fullName = data.useprofile == 1 ? data.profile : data.firstName + " " + data.lastName;
			data.location = Api.cleanLocation(data);
			data.facebookLink = (data.facebookOption == "1" && data.websiteUrl.length) ? data.websiteUrl : 'http://www.facebook.com/' + data.facebookId;
			if (data.facebookLink.substr(0, 4) != 'http') {
				data.facebookLink = 'http://' + data.facebookLink;
			}
			data.youtubePath = ['user', 'channel'].indexOf(data.youTubeUserName.split('/')[0]) > -1 ? data.youTubeUserName : 'user/' + data.youTubeUserName;
			service.channel = service.channelFormat(data);
			service.channel.finished = {}; // Keep track of whether there are more available of each post type
			service.channel.index = {}; // Keep track of unique item ids to prevent duplicates
			// Subscribe to Pusher
			service.subscribeToAsyncPusher();

			// Update URL if needed
			if (service.channel.profile !== $stateParams.profileUrlString) {
				service.internalLocationChange(service.channel.profile);
			}

			// Set Page Title
			$timeout(function() {
				if (!service.channel) {
					return false;
				}
				$rootScope.title = 'YouNow | ' + service.channel.profile + ' | Live Stream Video Chat | Free Apps on Web, iOS and Android';
			}, 1000);

			// Show a Google Ad in sidebar, specific to the current user
			// Api.loadGoogleAds(service.channel.profile);

			// Clear the comment box
			angular.element(document.getElementById('textarea_')).empty();

			// Show initial posts
			var params = {};
			// Get deeplinked post
			if ($stateParams.entityId && $stateParams.entityType) {
				params.entityId = $stateParams.entityId;
				params.deepLink = $stateParams.entityType;
			}
			// Otherwise get pinned post
			else {
				params.getPinned = 1;
			}

			// Fetch the data
			service.getItems('posts', params).then(function() {
				// When ready, show the right column
				if (!params.entityId) {
					getRightColumn();
				}
				// Or highlight the deeplinked post
				else {
					service.showDeepLink();
				}
			});

			// count services
			var total = 4;
			var connected = 0;
			if (service.channel.twitterId && service.channel.twitterId.length) {
				connected++;
			}
			if (service.channel.facebookId && service.channel.facebookId.length) {
				connected++;
			}
			if (service.channel.youTubeUserName && service.channel.youTubeChannelId.length) {
				connected++;
			}
			if (service.channel.instagramHandle && service.channel.instagramHandle.length) {
				connected++;
			}
			if (service.channel.googleId && service.channel.googleId.length) {
				connected++;
				total++;
			}
			service.channel.socialRatio = connected + '/' + total;
			service.channel.socialRatioCap = connected === total ? true : false;

			// add subscriptions
			if (service.channel_subscriptions_temp && service.channel_subscriptions_temp.length > 8) {
				service.channel.subscriptions = service.channel_subscriptions_temp;
				service.channel.subscriptions_extras = service.channel.subscriptions.splice(7);
				service.channel.subscriptions_extras.reverse();
				delete service.channel_subscriptions_temp;
			} else {
				service.channel.subscriptions = [];
				service.channel.subscriptions_extras = [];
			}

			//format the totial views
			if (service.channel.totalViews !== undefined) {
				service.channel.totalViews = $filter('number')(service.channel.totalViews);
			}

			if (service.channel.snKeyWords) {
				for (var sn in service.channel.snKeyWords) {
					if (service.channel.snKeyWords[sn].url && service.channel.snKeyWords[sn].url.substring(0, 4) == 'www.') {
						service.channel.snKeyWords[sn].url = 'http://' + service.channel.snKeyWords[sn].url;
					}
				}
			}
		});

		// all subscriptions
		Api.get('channel/getSubscriberOf/channelId=' + service.broadcaster.userId, {}, useCDN).success(function(data) {
			if (data.subscriberOf) {
				if (service.channel) {
					service.channel.subscriptions = data.subscriberOf;
					if (service.channel.subscriptions.length > 8) {
						service.channel.subscriptions_extras = service.channel.subscriptions.splice(7);
						service.channel.subscriptions_extras.reverse();
					}
					delete service.channel_subscriptions_temp;
				} else {
					service.channel_subscriptions_temp = data.subscriberOf;
				}
			} else {
				console.error('channel/getSubscriberOf/channelId=' + service.broadcaster.userId + ':', data);
			}
		}, function(error) {
			//console.log('getSubscriberOf FAILED', error);
		});

	};

	service.showDeepLink = function() {
		$timeout(function() {
			if (service.broadcaster.broadcastId && (service.broadcaster.broadcastId == $stateParams.entityId)) {
				$location.path('/' + $stateParams.profileUrlString);
				return false;
			}
			if ($stateParams.entityId && $stateParams.entityType) {
				if (!service.broadcaster.broadcastId) {
					trpx.updateBroadcast({
						broadcastId: $stateParams.entityId
					});
				} // set tracking broadcastid from url
				service.deeplinkId = service.channel.posts && service.channel.posts[0] && $stateParams.entityType !== 'c' ? service.channel.posts[0].id : $stateParams.entityId; // note this is dangerous, assuming the first post is the deeplinked post
				var deepPost = document.getElementById('post_' + service.deeplinkId);
				if (deepPost) {
					var scrollToElement = angular.element(document.getElementById('post_' + service.deeplinkId));
					$document.scrollTo(scrollToElement, 0, 1000).then(function() {
						// Remove highlight after a dely
						$timeout(function() {
							service.deeplinkId = 0;
						}, 1500);
						// If it's a broadcast, trigger the modal
						if ($stateParams.entityType === 'b' || $stateParams.entityType === 'f') {
							if (service.channel.posts[0] && service.channel.posts[0].media && service.channel.posts[0].media.broadcast && service.channel.posts[0].media.broadcast.videoAvailable) {
								$modal.mediaPlayerModal($stateParams.entityId);
							} else {
								archiveUnavailable('NOVIDEO');
							}
						}
						// Get right column once animation is complete
						$timeout(function() {
							getRightColumn();
						}, 1500);
					});
				} else {
					archiveUnavailable('NOPOST');
				}
			}
		}, 500);
	};

	var archiveUnavailable = function(reason) {
		trpx.capture({
			event: 'ARCHIVE_UNAVAILABLE',
			extradata: reason,
			platform: 3
		}, trpx.captureGroups.trackevents);
		Api.showTopNotification('Sorry, this broadcast is no longer available');
	};

	service.updateLanguage = function(language) {
		session.updateLanguage(language);
	};

	service.updateLocale = function(locale) {
		// backend
		var lang = (locale == 'me') ? 'ar' : locale;
		var params = {
			userId: session.user.userId,
			channelId: session.user.userId,
			UILanguage: lang,
			locale: locale
		};
		if (session.isBroadcasting || swf.settingUpBroadcast || (guestService.guest && guestService.guest.userId == session.user.userId)) {
			session.preventBroadcastInterrupt();
			return false;
		}
		Api.post('channel/updateSettings', params)
			.then(function(response) {
				if (response.data.errorCode === 0) {
					// frontend
					config.UILocale = locale;
					service.featuredBroadcaster(false, true);
					trpx.updateLocale(locale);
				}
			});
	};

	var methods = {
		posts: 'post/get',
		broadcasts: 'post/getBroadcasts',
		fans: 'channel/getFans',
		fansof: 'channel/getFansOf',
		subscribers: 'channel/getSubscribers'
	};
	var items = {
		posts: 'posts',
		broadcasts: 'posts',
		fans: 'fans',
		fansof: 'fans',
		subscribers: 'subscribers'
	};

	service.getItems = function(type, params) {

		if (!type) {
			type = service.tab;
		}
		if (!params) {
			params = {};
		}

		// Return false if not ready or finished loading this tab
		if (!service.channel || service.channel.finished[type]) {
			return $q.reject();
		}

		params.channelId = service.broadcaster.userId;
		// Paginate request
		if (service.channel[type]) {
			params.startFrom = service.channel[type].length;
		}
		// Fetch user specific data
		if (items[type] === 'posts' && session.user && session.user.userId) {
			params.userId = session.user.userId;
		}

		//make certain profile API requests CDN
		var cdnRequests = ['fansof', 'fans', 'subscribers', 'broadcasts'];
		var isCdn = false;
		if (cdnRequests.indexOf(type) !== -1) {
			isCdn = true;
		}

		return Api.get(methods[type], params, isCdn)
			.success(function(data) {

				//Check if user has changed states and therefore cleared channel
				if (!service.channel) {
					return $q.reject();
				}
				// Add items to array, and keep track to prevent duplicates
				angular.forEach(data[items[type]], function(item) {
					addItem(item, type);
				});
				// Determine if all items loaded
				service.channel.finished[type] = items[type] === 'posts' ? !data.hasMore : !data.hasNext;
				if (params.numberOfRecords === 1) {
					service.channel.finished[type] = false;
				} // TODO: backend bug saying finished when not
				if (service.channel.finished[type]) {
					$rootScope.hideFooter = false;
				}
			});
	};

	var addItem = function(item, type) {
		if (item.media && item.media.broadcast && item.media.broadcast.broadcastLength) {
			item.media.broadcast.broadcastLengthString = secondsToString(item.media.broadcast.broadcastLength);
		}

		if (!service.channel[type]) {
			service.channel[type] = [];
		}
		if (!service.channel.index[type]) {
			service.channel.index[type] = {};
		}
		var id = item.id || item.userId;
		if (!service.channel.index[type][id]) {
			service.channel[type].push(item);
			service.channel.index[type][id] = true;
		}
	};

	var secondsToString = function(secs) {
		// format
		var hrs = (Math.floor(secs / 3600) || '') + '';
		var hrs_ = '';
		if (hrs) {
			hrs_ = ':';
		}
		var min = (Math.floor((secs % 3600) / 60) || '0');
		var _min = '';
		if (min < 10 || min == '0') {
			_min = '0';
		}
		var min_ = ':';
		var _sec = '';
		var sec = (secs % 60) || '0';
		if (sec < 10 || sec == '0') {
			_sec = '0';
		}
		// set
		var string = hrs + hrs_ + _min + min + min_ + _sec + sec;
		// done
		return string;
	};

	var getRightColumn = function() {
		service.getItems('broadcasts', {
			numberOfRecords: 1
		}).then(function() {
			if (service.channel) {
				if (!service.broadcaster.broadcastId) {
					service.channel.preview = (service.channel.broadcasts && service.channel.broadcasts[0]) ? 'recent' : 'prompt';
				}
				getBiggestFans();
				getOnlineFans();
			}
		});

	};

	var getOnlineFans = function() {

		// Ignore if no longer on async
		if (!service.channel || !service.async) {
			return false;
		}

		var params = {
			numberOfRecords: 12,
			channelId: service.broadcaster.userId
		};

		return Api.get('channel/getLocationOnlineFans', params, true)
			.success(function(data) {
				// Ignore if the channel has changed
				if (!service.channel || service.channel.userId != params.channelId) {
					return false;
				}
				// Ignore if empty (potentially throttled)
				if (data.totalFans && service.channel) {
					service.channel.onlineFans = Api.sortUsers(data.users);
					service.channel.totalOnlineFans = data.totalFans;
				}
				Api.poll(getOnlineFans, 'getOnlineFans', data.nextRefresh);
			});

	};

	var getBiggestFans = function() {
		// Ignore if no longer on async
		if (!service.channel || !service.async) {
			return false;
		}

		var params = {
			numberOfRecords: 12,
			channelId: service.broadcaster.userId
		};

		return Api.get('channel/getTopPaidFans', params, true)
			.success(function(data) {
				// Ignore if the channel has changed
				if (!service.channel || service.channel.userId != params.channelId) {
					return false;
				}
				// Unlike getOnlineFans(), do not ignore if no total returned
				if (service.channel) {
					service.channel.biggestFans = Api.sortUsers(data.fans);
				}
			});

	};

	var liveBroadcastNotification = function() {
		var curId = service.curId !== undefined ? service.curId : 0;
		Api.get('broadcast/info', {
				channelId: service.broadcaster.userId,
				curId: curId
			})
			.then(function(data) {
				if (data) {
					data = data.data;
					if (!data.media) {
						$timeout(function() {
							liveBroadcastNotification();
						}, 2000);
					} else {
						service.updateBroadcaster(data, true)
							.then(function(response) {
								if (service.channel) {
									service.channel.preview = false;
									var href = "window.location.href='/" + data.profile + "?from=notification';";
									Api.showTopNotification('<a href="javascript:' + href + ';" >' + data.profile + ' just went live! Click here to watch them.</a>', "success", false, false, 10000);
								}
							});
					}
				}
			});
	};

	service.goLive = function() {
		if (session.isBroadcasting) {
			session.preventBroadcastInterrupt();
		} else if (session.checkBan()) {
			return false;
		} else {
			if (session.user.userId) {
				swf.settingUpBroadcast = true;
				service.switchToBroadcast(true);
			} else {
				session.showLoginModal('', 'GOLIVE').result.then(service.goLive);
			}
		}
	};

	// Must switch to flash before going live or showing tutorial
	service.switchToBroadcast = function(goingLive) {
		if (!swf.available()) {
			if (service.broadcaster && service.broadcaster.broadcastId) {
				service.switchAsync(false);
			} else {
				service.async = false;
				service.broadcaster = undefined;
				service.featuredBroadcaster(false, false, goingLive);
			}
		}
	};

	service.internalLocationChange = function(profile) {
		service.internalUpdate = true;
		$location.path('/' + profile);
		$location.hash('');
	};

	service.initBroadcast = function() {
		return Api.post('broadcast/init', {
			userId: session.user.userId,
			channelId: session.user.userId,
			ver: config.settings.JS_VERSION,
			mirror: 0
		});
	};

	service.addBroadcast = function(id, tag, publish, shareMsg, pc) {
		var params = {
			userId: session.user.userId,
			channelId: session.user.userId,
			broadcastId: id,
			ver: config.settings.JS_VERSION,
			tags: tag,
			fbPublish: publish.facebook ? 1 : 0,
			twPublish: publish.twitter ? 1 : 0,
			ytPublish: publish.youtube ? 1 : 0,
			tumblrPublish: publish.tumblr ? 1 : 0,
			mirror: 0,
			shareMsg: shareMsg
		};
		if (config.mcu && pc) {
			params.mcu = config.mcu;
			params.sdpOffer = pc.localDescription.sdp;
		} else {
			if (externalStreamer.settings.active) {
				params.broadcastType = 2;
			} else {
				params.broadcastType = 1;
			}
		}
		return Api.post('broadcast/add', params);
	};

	service.reconnect = function(pc) {
		var params = {
			userId: session.user.userId,
			sdpOffer: pc.localDescription.sdp
		};
		return Api.post('broadcast/reconnect', params);
	};

	service.dropBroadcast = function(id) {
		if (id) {
			return Api.post('broadcast/drop', {
				userId: id,
				channelId: id
			});
		}
	};

	var missingUser = function() {
		if (window.location.pathname.indexOf('/channel') !== -1 && window.waitForPageType) {
			$rootScope.gaPage({
				pageType: 'explore'
			});
		}
		window.waitForPageType = false;
		$state.go("main.explore");
		Api.showTopNotification('User could not be found');
		if (window.isPrerender) {
			$rootScope.httpStatus = 404;
		}
	};


	// Listen for loadChannel event from SWF
	$rootScope.$watch(function() {
		return swf.loadChannel;
	}, function(data) {
		if (data) {
			if (data.broadcaster !== undefined) {
				data.isBroadcasting = data.broadcaster == 1 ? true : false;
			}
			if (data.isBroadcasting !== undefined) {
				// Set broadcast status (being synced in the swf)
				swf.currentSession.isBroadcasting = data.isBroadcasting;
				session.isBroadcasting = data.isBroadcasting;
			}

			Api.googleAdLoaded = !session.isBroadcasting;
			// If SWF requests a channel, load it
			if (data.channelId) {
				service.channelSwitch = "END";

				service.switchBroadcaster(data.channelId);
			}
			// If SWF returns 0, load featured
			else if (data.channelId === 0 && !data.isBroadcasting) {
				service.featuredBroadcaster();
			}
			//always shut off the settingUpBroadcast flow when loading a new channel
			if (data.channelId !== undefined) {
				swf.settingUpBroadcast = false;
			}
		}
	});

	service.switchAsync = function(async) {
		service.async = async;
		if (async) {
			// If the channel has not been loaded yet, load it
			if (!service.channel) {
				service.setChannel();
			}
			// Otherwise, quick switch
			else {
				service.subscribeToAsyncPusher();
			}
		} else {
			service.showBroadcaster();
		}
	};

	service.subscribeToAsyncPusher = function() {
		pusher.ready().then(function() {
			pusher.subscribeToAsync(service.broadcaster.userId, function(eventName, eventData) {
				if (eventName === 'onBroadcast') {
					liveBroadcastNotification();
				}

				if (eventName === 'ontrackBroadcastViewtime') {
					service.broadcaster.broadcastId = false;
					getRightColumn();
				}
				// Only need realtime functionality on posts & broadcasts
				if (service.tab !== 'posts' && service.tab !== 'broadcasts') {
					return true;
				}
				// Set which tab is currently showing
				if (!service.channel[service.tab]) {
					service.channel[service.tab] = [];
				}
				if (!service.channel.index[service.tab]) {
					service.channel.index[service.tab] = {};
				}
				realtime.posts = service.channel[service.tab];
				realtime.index = service.channel.index[service.tab];
				if (realtime[eventName]) {
					realtime[eventName](eventData.message);
				}
			});
		});
		// @ptrwtts TODO
		// This way of handling realtime events on async is flawed
		// Instead of scanning through arrays of post / broadcast / replies,
		// looking for the relevant item, all items should be kept on an index,
		// along with arrays that reference the items
		// This way, if you want to edit an item, simply look it up
		// If an item doesn't exist, ignore the command
		// For new_comments, examine to see if it is a post or broadcast
	};

	// service.channelFormat moved to core
	swf.channelFormat = angular.copy(service.channelFormat); // so swf can call this without a circular dependency (not alias, or risk making the circular dependency anyway)

	service.getDownloadUrl = function(broadcastId) {
		var downloadUrl = config.settings.ServerHomeBaseUrl + 'php/api/broadcast/download/';
		downloadUrl += 'channelId=' + service.channel.userId;
		downloadUrl += '&broadcastId=' + broadcastId.toString();
		if (session && session.user && session.user.userId) {
			downloadUrl += '&userId=' + session.user.userId;
			// TODO: this fails if the user was logged out when the page was loaded
		}
		return downloadUrl;
	};

	service.realtime = {};
	var realtime = service.realtime;

	var findPosition = function(id, posts) {
		for (var i = 0; i < posts.length; i++) {
			if (posts[i].id == id) {
				return i;
			}
		}
	};

	realtime.new_comment = function(comment) {
		// Add a normal comment to the top
		if (!comment.parentId) {
			service.channel.posts.unshift(comment);
			service.channel.index[comment.id] = true;
		}
		// Add a reply to the bottom of parent replies
		else {
			var parent = realtime.posts[findPosition(comment.parentId, realtime.posts)];
			if (parent) {
				if (!parent.replies) {
					parent.replies = [];
				}
				parent.replies.push(comment);
			}
		}
	};

	realtime.new_like = function(like) {
		changeLikes(like, 1);
	};

	realtime.unlike_comment = function(like) {
		changeLikes(like, -1);
	};

	var changeLikes = function(like, change) {
		var item;
		if (like.parentId) {
			var parent = realtime.posts[findPosition(like.parentId, realtime.posts)];
			if (parent) {
				item = parent.replies[findPosition(like.id, parent.replies)];
			}
		} else {
			item = realtime.posts[findPosition(like.id, realtime.posts)];
		}
		if (item) {
			item.changeLikes(change);
		}
	};

	realtime.pin_comment = function(comment) {
		for (var i = 0; i < realtime.posts.length; i++) {
			var post = realtime.posts[i];
			post.isPinned = false;
			if (realtime.posts[i].id == comment.id) {
				post.isPinned = true;
				realtime.posts.splice(0, 0, realtime.posts.splice(i, 1)[0]);
			}
		}
	};

	realtime.delete_comment = function(comment) {
		if (comment.parentId) {
			var parent = realtime.posts[findPosition(comment.parentId, realtime.posts)];
			if (parent) {
				parent.replies.splice(findPosition(comment.id, parent.replies), 1);
			}
		} else {
			realtime.posts.splice(findPosition(comment.id, realtime.posts), 1);
		}
	};

	return service;

})

;
