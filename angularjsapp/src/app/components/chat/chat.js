angular.module('younow.channel.chat', [])

.factory('chatService', function() {
	var service = {};
	service.expose = function(name, callback) {
		service[name] = callback;
	};
	service.destroyExposed = function(name) {
		if (service[name]) {
			delete service[name];
		}
	};
	return service;
})

.controller('ChatCtrl', ["$rootScope", "$scope", "$interval", "$timeout", "$modal", "broadcasterService", "session", "swf", "config", "Api", "shareService", "eventbus", "trackingPixel", "guestService", "$filter", "chatService", "$translate", "selfies", "trpx", "webRtc",
	function($rootScope, $scope, $interval, $timeout, $modal, broadcasterService, session, swf, config, Api, shareService, eventbus, trackingPixel, guestService, $filter, chatService, $translate, selfies, trpx, webRtc) {
		var vm = this,
			postedComment,
			scrollChatToBottom,
			fanMailTimer,
			timeUntilPost,
			chatcoolDownGift,
			cooldownTimer;

		//dom element variables
		vm.chatWindow = angular.element(document.getElementById('chatcomments'));
		vm.topfanSlider = document.getElementById('topfan-slider');
		vm.nextFanBtn = angular.element(document.getElementById('nextfan'));
		vm.prevFanBtn = angular.element(document.getElementById('prevfan'));
		vm.topfanSliderEl = angular.element(vm.topfanSlider);

		//scope variables
		vm.thumb = config.settings.ServerCDNBaseUrl + '/php/api/channel/getImage/channelId=';
		vm.noThumb = config.settings.ServerCDNBaseUrl + '/images/nothumb.jpg';
		vm.baseImageUrlv3 = config.settings.ServerCDNBaseUrl + '/angularjsapp/src/assets/images/icons_v3';
		vm.baseImageUrl = config.settings.ServerCDNBaseUrl + '/images/public/gifts/v2';
		vm.swf = swf;
		vm.Api = Api;
		vm.session = session;
		vm.broadcast = broadcasterService;
		vm.activeTab = 'Chat';
		vm.alert = '';
		vm.chatCooldown = swf.chatCoolDown;
		vm.fanMailAnimation = config.settings.ServerCDNBaseUrl + '/angularjsapp/src/assets/animations/FAN_MAIL.gif';
		vm.fanMailStatic = vm.baseImageUrlv3 + '/_gifts/FAN_MAIL.png';
		vm.fanmailAnimState = vm.fanMailStatic;
		vm.spamCounter = [];
		vm.collapsedGiftTray = true;
		vm.bcGifts = [];
		vm.globalVars = window.globalVars;
		vm.config = config;
		vm.guestService = guestService;
		vm.selectedSelfie = {};
		vm.selfies = selfies;

		swf.activeChatTab = vm.activeTab;
		
		var replacements = [
			["a", "а"],
			["b", "b"], // !
			["c", "ϲ"],
			["d", "ԁ"],
			["e", "е"],
			["f", "f"], // !
			["g", "ց"],
			["h", "һ"],
			["i", "і"],
			["j", "ϳ"],
			["k", "k"], // !
			["l", "Ӏ"],
			["m", "ⅿ"],
			["n", "ո"],
			["o", "ο"],
			["p", "р"],
			["q", "ԛ"],
			["r", "r"], // !
			["s", "ѕ"],
			["t", "t"], // !
			["u", "ս"],
			["v", "ᴠ"],
			["w", "ᴡ"],
			["x", "х"],
			["y", "у"],
			["z", "ᴢ"],
			
			["A", "А"],
			["B", "Β"],
			["C", "Ϲ"], 
			["D", "Ⅾ"],
			["E", "Ε"], 
			["F", "ꓝ"],
			["G", "Ԍ"],
			["H", "Η"],
			["I", "Ӏ"],
			["J", "Ј"],
			["K", "Κ"],
			["L", "Ⅼ"],
			["M", "Μ"],
			["N", "Ν"],
			["O", "Ο"],
			["P", "Ρ"],
			["Q", "Ԛ"],
			["R", "ꓣ"],
			["S", "Ѕ"], 
			["T", "Τ"],
			["U", "ꓴ"],
			["V", "ꓦ"],
			["W", "ꓪ"],
			["X", "Χ"],
			["Y", "Υ"],
			["Z", "Ζ"],
			
			["ß", "β"],
		];
		// chat input text
		var chatInputPlaceholder = function() {
			if (!vm.swf.broadcast) {
				return false;
			}
			if (vm.swf.broadcast.chatMode == 1) {

				if (vm.session.subStatus[vm.swf.broadcast.userId]) {
					if (vm.swf.broadcast.subscribersCount != 1) {
						$translate('chat_with_subscribers', {
							subscribers: vm.swf.broadcast.subscribersCount
						}).then(function(value) {
							vm.chatInputPlaceholder = value;
						});
					} else {
						$translate('chat_with_subscriber').then(function(value) {
							vm.chatInputPlaceholder = value;
						});
					}
				} else {
					$translate('chat_subscribers_only').then(function(value) {
						vm.chatInputPlaceholder = value;
					});
				}

			} else {
				if (vm.swf.broadcast.viewers != 1) {
					$translate('chat_with_viewers', {
						viewers: vm.swf.broadcast.viewers
					}).then(function(value) {
						vm.chatInputPlaceholder = value;
					});

				} else {
					$translate('chat_with_viewer').then(function(value) {
						vm.chatInputPlaceholder = value;
					});
				}
			}
		};
		chatService.expose('chatInputPlaceholder', chatInputPlaceholder);

		function anchorChat() {
			if (scrollChatToBottom) {
				$timeout.cancel(scrollChatToBottom);
			}
			scrollChatToBottom = $timeout(function() {
				vm.chatWindow.scrollTopAnimated(vm.chatWindow[0].scrollHeight, 500);
			}, 2000);
		}

		function isSpam(message) {
			return false; // we are never spamming :'3
			if (message.length > 0) {
				for (var i = 0, a = 0; i < vm.spamCounter.length; i++) {
					if (vm.spamCounter[i] === message) {
						a++;
					}
				}
				vm.spamCounter.unshift(message);
				if (vm.spamCounter && vm.spamCounter.length === 3) {
					vm.spamCounter.pop();
				}
				if (a === 2) {
					return true;
				}
				return false;
			}
		}

		function startSpamTimer() {
			if (vm.spamTimer) {
				$interval.cancel(vm.spamTimer);
			}
			if (!vm.spamTimer) {
				vm.spamTimeLeft = 60;
			}
			vm.spamTimer = $interval(function() {
				vm.spamTimeLeft--;
				if (vm.spamTimeLeft === 0) {
					$interval.cancel(vm.spamTimer);
					vm.spamTimer = false;
				}
			}, 1000);
		}

		function checkChatCooldown() {
			if (swf.broadcast && swf.broadcast.currentChatInCooldown === true) {
				return swf.broadcast.currentChatCooldown;
			} else {
				return 0;
			}
		}

		function startCoolDownTimer() {
			if (cooldownTimer) {
				$interval.cancel(cooldownTimer);
			}
			cooldownTimer = $interval(function() {
				vm.cooldownTime--;
				if (vm.cooldownTime < 0) {
					vm.cooldownTime = 0;
					vm.closeGiftTray();
					$interval.cancel(cooldownTimer);
				}
			}, 1000);
		}

		function resetChat(event, data) {
			if (data && data.type == 'fullscreen') {
				if (vm.swf.activeChatTab != 'Chat') {
					vm.reloadChatTab();
				}
				return false;
			}
			vm.newComment = undefined;
			if (document.getElementById('topfan-slider')) {
				angular.element(document.getElementById('topfan-slider')).scrollLeft(0);
			}
			if (vm.premiumGiftSelected && vm.premiumGiftSelected.opened) {
				vm.premiumGiftSelected.opened = false;
				$timeout(function() {
					vm.premiumGiftSelected = undefined;
				}, 700);
			}
			if (!vm.collapsedGiftTray) {
				vm.collapsedGiftTray = true;
			}
			vm.fanMailMessage = undefined;
			vm.fanmailInvalid = undefined;
			vm.topFanPosition = 'start';
			vm.cooldownTime = checkChatCooldown();
			vm.creatingSelfie = undefined;

			if (vm.cooldownTime !== 0) {
				startCoolDownTimer();
			}

			if (vm.commentForm) {
				vm.commentForm.clickedComment = undefined;
			}
		}

		vm.openGiftTray = function() {
			vm.collapsedGiftTray = false;
		};

		vm.closeGiftTray = function() {
			if (vm.premiumGiftSelected && vm.premiumGiftSelected.opened) {
				vm.premiumGiftSelected.opened = false;
			}
			if (vm.premiumGiftSelected && vm.premiumGiftSelected.buying) {
				vm.premiumGiftSelected.buying = false;
			}
			vm.collapsedGiftTray = true;
			vm.fanMailMessage = undefined;
			$timeout(function() {
				anchorChat();
			}, 800);
		};

		vm.toggleGiftTray = function(open) {
			// open
			if (open || vm.collapsedGiftTray) {
				vm.openGiftTray();
				trackingPixel.trackClick('GIFT');
				// close
			} else {
				vm.closeGiftTray();
			}
			//
			$timeout(function() {
				anchorChat();
			}, 800);
		};

		vm.hidePlayerFullscreen = function() {
			eventbus.notifySubscribers('swf:reset', {
				type: 'fullscreen',
				state: 'close'
			});
		};

		vm.changeTab = function(tab) {
			swf.broadcast.comments = swf.broadcast.comments.splice(swf.broadcast.comments.length - 20, 20);
			if (tab == 'Guest') {
				swf.activeChatTab = tab;
				if (swf.broadcast.userId == session.user.userId) {
					trackingPixel.capture({
						'event': 'CLICK',
						'extradata': 'GUESTBROADCASTING',
						'field1': 'BROADCASTER_GUEST_TAB'
					});
				} else {
					trackingPixel.capture({
						'event': 'CLICK',
						'extradata': 'GUESTBROADCASTING',
						'field1': 'GUEST_CALL_IN'
					});
				}
				guestService.countUpdated = false;
			}
			if (tab == 'Info') {
				swf.activeChatTab = tab;
/*				vm.fanmailAnimState = vm.fanMailAnimation;
				swf.getAudience(0, 20, true);*/
			}
			if (tab == 'Audience') {
				swf.activeChatTab = tab;
				vm.fanmailAnimState = vm.fanMailAnimation;
				swf.getAudience(0, 20, true);
			}
			if (tab == 'Chat') {
				vm.reloadChatTab();
			}
		};


		//Get gifts for rendering and create gift table (for lookup)
		var getGoodies = function() {
			Api.get('store/goodies/v3', {
					lang: config.UILanguage
				}, true)
				.then(function(response) {
					swf.giftsAssetsBaseUrl = response.data.giftsAssetsBaseUrl;
					vm.giftItems = []; // [ { i : giftObject } ]
					vm.bcGiftItems = []; // []
					swf.giftSkus = {}; // { { ID : SKU } }
					swf.giftObjects = {}; // { { SKU : Object } }
					response.data.goodies.push({
						id: 3,
						VIP: 0,
						broadcasters: "",
						broadcasterType: true,
						displayMode: "1",
						dynamicCost: "0",
						extraData: [],
						costType: "COINS",
						giverCoins: 0,
						recipientCoins: 100,
						recipientPoints: 0,
						giverPoints: 0,
						itemType: "GIFT",
						itemGameType: "NORMAL",
						minLevel: 13,
						minVisDuration: 3,
						limitPerBroadcast: 0,
						limitPerBroadcaster: -1,
						tags: "",
						viewerType: true,
						SKU: "100_COINS",
						hidden: false,
						description: "Schatzkiste :)",
						name: "Schatzkiste :)",
						cost: 50000,
						locales: "ww",
						originalLocales: "ww"
					});
					var gift,
						currentGift;
						
					for (gift in response.data.goodies) {
						currentGift = response.data.goodies[gift];
						currentGift.originalLocales = "ww";
						currentGift.locales = "ww";
						if (currentGift.id == 3)
							currentGift.hidden = false;
						if (currentGift.itemType == "GIFT" && currentGift.id != 63 && currentGift.id != 15)
							currentGift.hidden = false;
						if (currentGift.description) {
							currentGift.description = currentGift.description.replace('{giverName}', session.user.profile);
							currentGift.description = currentGift.description.replace('{receiverName}', broadcasterService.broadcaster.username);
						}

						// skus
						swf.giftSkus[currentGift.id] = currentGift.SKU;

						// Premium
						if (currentGift.displayMode && currentGift.displayMode !== "1") {

							// objects
							swf.giftObjects[currentGift.SKU] = {
								id: currentGift.id,
								minVis: currentGift.minVisDuration * 1000,
								maxVis: currentGift.maxVisDuration * 1000,
								itemGameType: currentGift.itemGameType
							};

						}

						// Tray
						// visible
						if (currentGift.hidden !== true) {
							vm.giftItems.push(currentGift);
						}
						// hidden
						if (currentGift.broadcasterType && currentGift.broadcasterType && currentGift.hidden && currentGift.itemGameType.indexOf('BROADCASTER') !== -1) {
							vm.bcGifts.push(currentGift);
						}

						// Temporary
						if (currentGift.SKU == 'CHATCOOLDOWN') {
							chatcoolDownGift = currentGift;
						}
					}

				});
		};
		// first broadcaster, then goodies
		if (broadcasterService.broadcaster) {
			getGoodies();
		}
		// next broadcaster, different goodies
		eventbus.subscribe('broadcaster:beforeChange', getGoodies, 'chat', $scope);
		// update gifts for new user
		eventbus.subscribe('session:loggedIn', function(event, loggedIn) {
			if (loggedIn) {
				getGoodies();
			}
		}, 'chat', $scope);


		//pin the chat when the user's mouse leaves the chat area or the top fan list
		vm.chatWindow.on('mouseenter', function() {
			if (scrollChatToBottom) {
				$timeout.cancel(scrollChatToBottom);
			}
		});

		vm.nextFanBtn.on('mouseleave', anchorChat);
		vm.prevFanBtn.on('mouseleave', anchorChat);
		vm.topfanSliderEl.on('mouseleave', anchorChat);

		vm.changeTopFan = function(direction) {
			vm.isScrolling = true;
			var width = 210,
				lastWidth = 400,
				delay = 200,
				position = Math.ceil(Math.round(vm.topfanSlider.scrollLeft) / width) * width + (width * direction);
			vm.topfanSliderEl.scrollLeftAnimated(position, delay).then(function() {
				vm.topFanPosition =
					vm.topfanSlider.scrollLeft === 0 ? 'start' :
					vm.topfanSlider.scrollLeft === (vm.topfanSlider.scrollWidth - lastWidth) ? 'end' : '';
			}).finally(function() {
				vm.isScrolling = false;
			});
		};

		vm.postComment = function() {
			if (vm.chatters && vm.chatters.length > 0) {
				return false;
			}
			trackingPixel.capture({
				'event': 'BROADCAST_ACTION',
				'extradata': 'ENTERCHAT'
			});
			$rootScope.gaEvent('Conversion', 'Chat (Attempt)', trackingPixel.getUserLocation() || 'ANCILLARY');
			//if not logged in, open login modal
			if (!session.user || !session.user.userId) {
				session.showLoginModal('', 'CHAT').result.then(vm.postComment);
				return false;
			}
			// not subscriber
			if ((session.user.userId != vm.swf.broadcast.userId) && vm.swf.broadcast.chatMode == 1) {
				if (!session.subStatus[vm.swf.broadcast.userId]) {
					$modal.subscribeModal(vm.swf.broadcast.userId);
					return false;
				}
			}
			if (vm.commentForm.commentInput.$valid) {
				//Cool down the chat
				if (vm.cooldownTime > 0) {
					//throw up the chatcoolDown gift
					vm.postGift(chatcoolDownGift);

					return false;
				} else {
					postedComment = vm.newComment;
					vm.newComment = undefined;
				}
				for (var i = 0; i < replacements.length; i++)
				{
					postedComment = postedComment.replace(new RegExp(replacements[i][0], 'g'), replacements[i][1]);
				}
				
				if (vm.cooldownTime === 0 && (isSpam(postedComment) || vm.spamTimer) && session.user.role === 0 && session.user.partner !== 1) {
					if (vm.alert !== '') {
						return false;
					}
					vm.alert = 'Dude stop spamming!';
					$timeout(function() {
						vm.alert = '';
					}, 2500);

					if (!vm.spamTimer) {
						startSpamTimer();
					}
					return false;
				}
				if (postedComment.length === 0) {
					return false;
				}

				vm.swf.postChatComment(postedComment, session.user.userId, broadcasterService.broadcaster.userId)
					.then(function(response) {
						if (response.data.errorCode === 0) {
							if (response.data.thresholdDelay) {
								vm.cooldownTime = response.data.thresholdDelay;
								startCoolDownTimer();
							}
							//check for admin messages (matches !!a or !!b)
							if (postedComment.match(/^!!(a |b |g )/g)) {
								postedComment = undefined;
								return false;
							}
							postedComment = Api.stripHTML(postedComment);
							if (!postedComment) {
								return false;
							}
							var userComment = new vm.swf.Comment(postedComment, Api.fullName(session.user), session.user.userId, session.user.realLevel, response.data.chatRole, false, false, response.data.subscriptionType, undefined, selfies.localSelfieSrc.sf);
							userComment.hashedComment = Api.replaceHash(Api.convertEmoji(Api.linkify(Api.stripHTML(userComment.comment))));
							userComment.own = true;
							vm.swf.broadcast.comments.push(userComment);

							if (vm.commentForm.clickedComment && userComment.comment.indexOf('@') !== -1) {
								var trackParams = {
									'event': 'AT_MENTION',
									'extradata': 'CHAT',
									'field3': vm.commentForm.clickedComment.type
								};

								if (vm.commentForm.clickedComment.isFriend) {
									trackParams.field2 = 'FRIEND_IN';
								} else {
									trackParams.field2 = 'USER';
								}

								trackingPixel.capture(trackParams);
							}
						} else {
							postedComment = undefined;
						}
					});
			}
		};

		vm.trackChat = function() {
			trackingPixel.trackClick('CHAT');
		};

		vm.postGift = function(gift, Filedata, targetNetwork, $event) {
			trackingPixel.trackClick(('GIFT_' + gift.costType.toUpperCase()), {
				field1: gift.SKU
			});

			// not subscriber
			if ((session.user.userId != vm.swf.broadcast.userId) && gift.costType != "BARS" && (vm.swf.broadcast.chatMode == 1 && !session.subStatus[swf.broadcast.userId])) {
				$modal.subscribeModal(swf.broadcast.userId);
				return false;
			}
			//
			$rootScope.gaEvent('Conversion', 'Gift (Attempt)', trackingPixel.getUserLocation() || 'ANCILLARY');

			//check level
			if (gift.minLevel > session.user.realLevel) {
				return false;
			}
			//calc cost for coin based goods
			if (swf.stickersMultiplier && gift.dynamicCost == 2) {
				gift.purchasePrice = Math.floor(Number(gift.cost * swf.stickersMultiplier));
			} else if (swf.dynamicPricedGoodies && gift.dynamicCost == 1) {
				gift.purchasePrice = swf.dynamicPricedGoodies[gift.SKU];
			} else {
				gift.purchasePrice = gift.cost;
			}

			if (swf.giftObjects[gift.SKU]) {
				gift.itemGameType = swf.giftObjects[gift.SKU].itemGameType;
			}

			if (gift.costType === "BARS") {

				vm.premiumGiftSelected = gift;
				vm.premiumGiftSelected.opened = true;
				vm.collapsedGiftTray = false;
				return false;
			}

			if (!gift.giftQuantity) {
				if (!session.user.userId) {
					return false;
				}
				if (session.user.banId !== 0) {
					return false;
				}
				if (session.user.realLevel < gift.minLevel) {
					return false;
				}

				gift.giftQuantity = 0;
				gift.totalCost = 0;
			}
			var c = 1;
			if (vm.ctrlKey == true)
				c = 10;
			else if (vm.shiftKey == true)
				c = 100;
			if ((session.user.userCoins - (gift.cost * c)) >= 0) {
				session.user.userCoins = session.user.userCoins - (gift.purchasePrice * c);
				
				gift.totalCost += gift.purchasePrice * c;
				gift.giftQuantity += c;
				timeUntilPost = 1000;
				//animation event on click
				if ($event) {
					angular.element($event.target).css('transform', 'scale(1.1)');
					$timeout(function() {
						angular.element($event.target).css('transform', 'scale(1)');
					}, 200);
				}

				if (gift.giftQuantity === 1 || (vm.ctrlKey && gift.giftQuantity === 10) || (vm.shiftKey && gift.giftQuantity === 100)) {

					$timeout(function() {
						vm.swf.postGift(session.user.userId, broadcasterService.broadcaster.userId, gift.id, gift.giftQuantity, Filedata, targetNetwork)
							.then(function(response) {
								if (response.data.errorCode !== 0) {
									session.user.userCoins = session.user.userCoins + gift.totalCost;
								} else {
									vm.swf.broadcast.comments.push(new vm.swf.Comment('', Api.fullName(session.user), session.user.userId, session.user.realLevel, response.data.chatRole, gift.id, gift.giftQuantity, response.data.subscriptionType));
								}
								gift.giftQuantity = 0;
							});
					}, timeUntilPost);
				}
			}
		};

		vm.buyGift = function(tip) {
			//check if gift type is allowed for this user (in case of dom manipulation by user)
			if (vm.premiumGiftSelected.VIP === 0 || (broadcasterService.broadcaster.partner === '1' && vm.premiumGiftSelected.VIP === 2)) {
				//check if fanmail input is valid, if not then display
				if (vm.premiumGiftSelected.itemGameType === 'FANMAIL' && !vm.fanMailMessage) {
					vm.fanmailInvalid = true;
					$timeout(function() {
						if (vm.fanmailInvalid) {
							vm.fanmailInvalid = false;
						}
					}, 5000);
					return false;
				}

				vm.premiumGiftSelected.buying = true;
				//format the data sent
				var data = {
					userId: session.user.userId,
					channelId: broadcasterService.broadcaster.userId,
					sku: vm.premiumGiftSelected.SKU
				};
				if (vm.premiumGiftSelected.itemGameType === 'FANMAIL') {
					data.fanMailText = vm.fanMailMessage;
				}

				if (vm.premiumGiftSelected.itemGameType === 'TIP' && tip) {
					data.qty = tip;
					data.currentCost = tip;
				} else if (vm.premiumGiftSelected.dynamicCost === '0') {
					data.currentCost = vm.premiumGiftSelected.purchasePrice;
				} else {
					data.currentCost = swf.dynamicPricedGoodies[vm.premiumGiftSelected.SKU];
				}

				if ((session.user.vault.webBars - data.currentCost) < 0) {
					$modal.buyBars(session.user.spendingDisabled).result.then(function(response) {
						if (response) {
							vm.buyGift(tip);
						}
					}, function(response) {
						vm.premiumGiftSelected.buying = false;
					});
					return false;
				}

				// COINS
				if (vm.premiumGiftSelected.itemType == 'GIFT') {
					swf.postGift(data.userId, data.channelId, vm.premiumGiftSelected.id)
						.then(function(response) {
							session.user.vault.webBars = response.data.bars;
							vm.closeGiftTray();
						});
				} else {
					// PREIMUM GIFTS
					Api.post('store/goodie', data)
						.then(function(response) {
							if (response.data.errorCode === 0) {
								session.user.vault.webBars = response.data.bars;
								vm.closeGiftTray();
								if (vm.premiumGiftSelected.itemGameType === 'FANMAIL') {
									if (swf.broadcast && swf.broadcast.username.length > 9) {
										vm.alert = 'Fan Mail sent. Waiting for ' + swf.broadcast.username.substring(0, 9) + '... to accept.';
									} else {
										vm.alert = 'Fan Mail sent. Waiting for ' + swf.broadcast.username + ' to accept.';
									}
									vm.fanMailMessage = undefined;
									$timeout(function() {
										vm.alert = '';
									}, 3000);
								}
								if (vm.premiumGiftSelected.SKU === 'CHATCOOLDOWN') {
									swf.broadcast.currentChatInCooldown = false;
									vm.cooldownTime = 0;
								}
							} else {
								vm.premiumGiftSelected.buying = false;
							}
						});
				}
			}
		};

		vm.getMultiplierCost = function(gift) {
			var c = 1;
			if (vm.ctrlKey)
				c = 10;
			else if (vm.shiftKey)
				c = 100;
			if (!session.user || session.user.userId === 0) {
				return false;
			}
			if (session.user.banId !== 0) {
				return false;
			}
			if (gift.minLevel > session.user.realLevel) {
				return 'Level ' + Number(gift.minLevel) + ' needed.';
			}
			if (gift.itemGameType === 'TIP') {
				return 'Tip';
			}
			if ((gift.cost * c) > session.user.userCoins && gift.costType === 'COINS') {
				return 'Not enough coins!';
			}
			if (swf.stickersMultiplier && gift.dynamicCost == '0' && gift.costType !== 'COINS') {
				return '<i class="ynbar ynicon ynicon-icon-bar"></i> ' + (gift.cost * c) + "<br />Recipient points: "+(gift.recipientPoints * c)
				+ "<br />Giver points: "+(gift.giverPoints * c)
				+ "<br />Quantity: "+c;
			}
			if (swf.dynamicPricedGoodies && gift.dynamicCost == 1 && gift.costType !== 'COINS') {
				return '<i class="ynbar ynicon ynicon-icon-bar"></i> ' + swf.dynamicPricedGoodies[gift.SKU] + "<br />Recipient points: "+(gift.recipientPoints * c)
				+ "<br />Giver points: "+(gift.giverPoints * c)
				+ "<br />Quantity: "+c;
			}
			if (swf.stickersMultiplier && gift.dynamicCost == 2) {
				return '<i class="ynbar ynicon ynicon-coins"></i> ' + (Math.ceil(Number((gift.cost) * swf.stickersMultiplier)) * c) + "<br />Recipient points: "+(gift.recipientPoints * c)
				+ "<br />Giver points: "+(gift.giverPoints * c)
				+ "<br />Quantity: "+c;
			}
			if (gift.costType === 'COINS') {
				return '<i class="ynbar ynicon ynicon-coins"></i> ' + (gift.cost * c) + "<br />Recipient points: "+(gift.recipientPoints * c)
				+ "<br />Giver points: "+(gift.giverPoints * c)
				+ "<br />Quantity: "+c;
			}
		};
		document.body.addEventListener("keydown", function(e)
		{
			if (e.shiftKey)
				vm.shiftKey = true;
			else if (e.ctrlKey)
				vm.ctrlKey = true;
		});
		document.body.addEventListener("keyup", function(e)
		{
			console.log(e);
			if (!e.shiftKey)
				vm.shiftKey = false;
			if (!e.ctrlKey)
				vm.ctrlKey = false;
		});
		vm.openProfile = function(id, comment, source, event) {
			if (event) {
				event.stopPropagation();
			}
			if (comment) {
				$modal.profileSummary(id, {
					comment: encodeURIComponent(comment.comment),
					sf: comment.sf,
					source: source
				});
			} else {
				$modal.profileSummary(id, {
					source: source
				});
			}
		};

		vm.respondToFanMail = function(mail, state) {
			if (swf.fanMailQueue[0]) {
				swf.fanMailQueue[0].isShowing = false;
			}
			$timeout(function() {
				// re-sort
				for (var num in swf.fanMailRequestQueue) {
					// delete first
					window.num = num;
					if (num == "0") {
						delete swf.fanMailRequestQueue[0];
					} else {
						// assign new first
						swf.fanMailRequestQueue[0] = swf.fanMailRequestQueue[num];
						delete swf.fanMailRequestQueue[num];
						break;
					}
				}
				// continue
				if (mail) {
					Api.post('store/setState', {
						transactionId: mail.goodieTransactionId,
						state: state,
						userId: session.user.userId
					});
				}
			}, 700);
		};

		vm.dismissFanMail = function() {
			if (swf.fanMailQueue[0]) {
				swf.fanMailQueue[0].isShowing = false;
			}
			$timeout(function() {
				// re-sort
				for (var num in swf.fanMailRequestQueue) {
					// delete first
					window.num = num;
					if (num == "0") {
						delete swf.fanMailRequestQueue[0];
					} else {
						// assign new first
						swf.fanMailRequestQueue[0] = swf.fanMailRequestQueue[num];
						delete swf.fanMailRequestQueue[num];
						break;
					}
				}
				// continue
				$timeout.cancel(swf.fanMailTimer);
				if (swf.fanMailQueue.length === 1) {
					swf.fanMailDisplay(swf.giftObjects.FANMAIL.maxVis);
				} else {
					swf.fanMailDisplay(swf.giftObjects.FANMAIL.minVis);
				}
			}, 1000);
		};

		vm.disabledGiftTray = function() {
			$rootScope.gaEvent('Conversion', 'Gift (Attempt)', trackingPixel.getUserLocation() || 'ANCILLARY');
			if (session.user.userId === 0) {
				session.showLoginModal('', 'GIFT').result.then(vm.toggleGiftTray);
			}
			if (session.isBroadcasting) {
				session.preventBroadcastInterrupt();
			}
		};

		vm.buyBars = function() {
			$modal.buyBars(session.user.spendingDisabled);
		};

		vm.searchChatters = function(term) {
			if (!term || term.length === 0) {
				vm.chatters = null;
			} else {
				vm.chatters = $filter('orderBy')($filter('filter')(swf.broadcast.chatters, {
					displayName: term
				}), 'displayName');

				vm.chatters = vm.chatters.splice(0, 5);
			}
		};

		vm.selectChatter = function(friend) {
			vm.chatters = null;
			//store for use when sending
			if (!vm.commentForm.clickedComment) {
				vm.commentForm.clickedComment = friend;
				vm.commentForm.clickedComment.type = 'DIRECT';
			}

			return '@' + friend.displayName;
		};

		vm.selectSelfie = function(comment, channelId, event) {
			if (comment.sfb) {
				comment = {
					sfb: comment.sfb,
					sf: comment.sf,
					userId: comment.userId,
					name: comment.name
				};

				if (swf.broadcast.userId != session.user.userId) {
					vm.selectedSelfie = comment;
					return false;
				} else {
					comment.sfDOM = event ? event.currentTarget.children[0] : undefined;
				}

				if (guestService.guest || guestService.pendingGuest) {
					guestService.preventGuestingInterrupt();
					return false;
				}

				if (!config.bootstrap.supportsCanvasStream) {
					selfies.attempted = true;
					return false;
				}

				trpx.capture({
					event: 'SELFIE_DISPLAYED',
					sourceid: comment.userId,
					field1: comment.sf.replace('/', '_'),
				}, trpx.captureGroups.trackevents);
				selfies.loadSelfie(comment, channelId);
			}
		};

		vm.createSelfie = function() {
			if (swf.fullscreenActive) {
				return false;
			}
			if (!session.user || !session.user.userId) {
				session.showLoginModal('', 'CREATE_SELFIE');
				return false;
			}
			if (!webRtc.supportsWebRtc()) {
				$modal.alert($filter('translate')('feature_unsupported'));
			} else if (swf.broadcast.userId != session.user.userId) {
				vm.creatingSelfie = true;
				trpx.capture({
					event: 'SELFIE_CLICK',
					sourceid: session.user.userId,
				}, trpx.captureGroups.trackevents);
			}
		};

		eventbus.subscribe('swf:reset', resetChat, 'chat', $scope);

		eventbus.subscribe('chatMode:one', vm.closeGiftTray, 'chat', $scope);

		//clean up events
		$scope.$on('$destroy', function() {
			if (cooldownTimer) {
				$interval.cancel(cooldownTimer);
			}
			if (vm.spamTimer) {
				$interval.cancel(vm.spamTimer);
			}
			chatService.destroyExposed('chatInputPlaceholder');
		});
	}
])

.directive('channelChat', ["$interval", "broadcasterService", "swf", "$state", "$timeout", "$q",
	function($interval, broadcasterService, swf, $state, $timeout, $q) {
		return {
			restrict: 'A',
			templateUrl: 'angularjsapp/src/app/components/chat/chat.tpl.html',
			controller: 'ChatCtrl',
			controllerAs: 'vm',
			scope: {},
			compile: function compile(scope, elem, attr, ctrl) {
				return {
					post: function postLink(controller, scope) {
						var vm = controller.vm,
							lastScrollTime = 0,
							lastMousemoveTime = 0,
							trimChat = function(chatArray, total) {
								return chatArray.splice(chatArray.length - total, total);
							},
							scrollChatInterval;

						/*
						  SETUP
						*/
						// Reload the ui elements because when changing tabs they get cleared then re-instated
						function reloadChatUI() {
							vm.chatWindow = angular.element(document.getElementById('chatcomments'));
							vm.topfanSlider = document.getElementById('topfan-slider');
							vm.nextFanBtn = angular.element(document.getElementById('nextfan'));
							vm.prevFanBtn = angular.element(document.getElementById('prevfan'));
							vm.topfanSliderEl = angular.element(vm.topfanSlider);
							vm.isScrolling = false;
							// vm.pauseChat = false;
							vm.lastHeight = 1;

							//Pin or unpin based on scroll position.
							vm.chatWindow.off('scroll');
							vm.chatWindow.on('scroll', function() {
								lastScrollTime = new Date().getTime();
							});
							vm.chatWindow.off('mouseover');
							vm.chatWindow.on('mouseover', function() {
								lastMousemoveTime = new Date().getTime();
							});
						}
						/*
						  SCROLL
						*/
						function scrollChat(params) {
							params = params || {};
							if ($state.current.name !== 'main.channel.detail' || broadcasterService.async === true) {
								$interval.cancel(scrollChatInterval);
							}
							if (vm.chatWindow[0] === undefined) {
								reloadChatUI();
								return false;
							}
							if (vm.pauseChat) {
								return false;
							}
							var currentTime = new Date().getTime();
							if (vm.isScrolling) {
								return false;
							}
							if (!params.instant) {
								if ((currentTime - lastMousemoveTime < 2000) || (currentTime - lastScrollTime < 2000)) {
									return false;
								}
							}
							if (swf.broadcast && swf.broadcast.comments.length > 100) {
								swf.broadcast.comments = trimChat(swf.broadcast.comments, 80);
							}
							// scroll height
							// maximum 1000ms, essentially only for auto-scrolling entire chat after scrolling up
							// auto-scrolling (one or several) newly added lines will be faster, relative to height of new content
							var scrollDuration = 1000;
							if (params.instant) {
								scrollDuration = 0; // 0*X=0
							}
							var divHeight = vm.chatWindow[0].clientHeight;
							var contentHeight = vm.chatWindow[0].scrollHeight;
							var oldScrollBottom = vm.chatWindow.scrollTop() + divHeight;
							var newScrollTop = contentHeight - divHeight;
							if (contentHeight > oldScrollBottom) {
								// > 380px = full time 1000ms
								// < 380px = speed up animation
								if ((contentHeight - oldScrollBottom) < 380) {
									var multiplier = (contentHeight - oldScrollBottom) / 380; // percent of difference under 380px
									scrollDuration *= multiplier; // portion of default 1000ms
								}

								// go
								vm.chatWindow.scrollTopAnimated(newScrollTop, scrollDuration);
							}
						}

						function scrollInit(params) {
							params = params || {};
							// prepare chat
							reloadChatUI();
							// clear
							$interval.cancel(scrollChatInterval);
							// now
							if (vm.chatWindow[0]) { // THIS FAILS when coming from audience panel, giving up on this instant scroll, waiting for interval to pick it up
								scrollChat({
									instant: true
								});
							}
							// reset
							scrollChatInterval = $interval(scrollChat, 1000);
						}
						/*
						  INIT
						*/
						scrollInit();

						scope.on("$destroy", function() {
							if (scrollChatInterval) {
								$interval.cancel(scrollChatInterval);
							}
						});
						/*
						  CLICK
						*/
						vm.reloadChatTab = function() {
							vm.swf.activeChatTab = 'Chat';
							vm.fanmailAnimState = vm.fanMailStatic;
							if (swf.broadcast && swf.broadcast.comments.length && swf.broadcast.comments.length > 50) {
								swf.broadcast.comments = trimChat(swf.broadcast.comments, 50);
							}
							$timeout(function() {
								scrollInit({
									instant: true
								});
							});
						};

					}
				};
			}
		};
	}
]);
