angular.module('younow.services.dashboard', [])

.factory('dashboard', ["$http", "$timeout", "Api", "config", "$filter", "$rootScope", "$q", "$state", function($http, $timeout, Api, config, $filter, $rootScope, $q, $state) {

	var dashboard = {};
	var currentBroadcast = {
		channelId: null,
		viewers: null
	};

	function formatTrendingLists(listNode, dashboardNode, data) {
		var i;
		for (i = data[listNode].length - 1; i >= 0; i--) {
			if (data[listNode][i] === null || !data[listNode][i].username || data[listNode][i].viewers === null || !data[listNode][i].userId) {
				data[listNode].splice(i, 1);
			} else {
				if (currentBroadcast.channelId != data[listNode][i].userId) {
					data[listNode][i].viewers = Api.squashedNumber(data[listNode][i].viewers, 3);
				} else {
					data[listNode][i].viewers = currentBroadcast.viewers;
				}
			}
		}
		if (data.trending_users.length) {
			dashboard[dashboardNode] = data[listNode];
		}
		if (data[listNode].length > 0 && dashboardNode == 'users') {
			dashboard.filterUsers();
		}
	}

	var getTrending = function() {
		var data = {};

		//if not on the live broadcast page then make sure to clear the currentBroadcast dashboard information so we can return to default CDN data
		if ($state.current.name !== 'main.channel.detail') {
			currentBroadcast = {
				channelId: null,
				viewers: null
			};
		}

		//load the dashboard initially and then only refresh when we're on the right route
		if ((!dashboard.tags || !dashboard.users) || ($state.current.name === 'main.channel.detail' || $state.current.name === 'main.explore' || $state.current.name === 'main.settings')) {
			Api.get('younow/dashboard', {
				locale: config.UILocale,
				trending: 50
			}, 'usecdn').success(function(data) {
				data = data;
				var i;
				// Attach the data to the scope
				if (data.trending_users) {
					formatTrendingLists('trending_users', 'users', data);
				}
				if (data.featured_users) {
					formatTrendingLists('featured_users', 'featuredUsers', data);
				}
				if (data.trending_tags) {
					for (i = data.trending_tags.length - 1; i >= 0; i--) {
						if (data.trending_tags[i] === null) {
							data.trending_tags.splice(i, 1);
						}
					}
					if (data.trending_tags.length) {
						dashboard.tags = data.trending_tags;
					}
				}
				// Refresh
			});
		}
		Api.poll(getTrending, 'getTrending', data.nextRefresh, 10);
	};

	// for dashboard.users
	var getBroadcastThumb = function(user, backup) {
		var thumb;
		if (user.broadcastId && config.settings.UseBroadcastThumbs) {
			thumb = Api.generateDynamicApi('BROADCAST_THUMB_DYNAMIC') + '/' + user.broadcastId + '/' + user.broadcastId + '.jpg';
			if (backup) {
				thumb = config.settings.ServerCDNBaseUrl + "/php/api/getBroadcastThumb/broadcastId=" + user.broadcastId;
			}
		} else if (user.tag && user.tag.length > 0 && user.userId && config.settings.UseBroadcastThumbs) {
			thumb = config.settings.ServerCDNBaseUrl + "/php/api/getBroadcastThumb/userId=" + user.userId;
		} else {
			thumb = config.settings.ServerCDNBaseUrl + "/php/api/channel/getImage/channelId=" + user.userId;
		}
		return thumb;
	};

	dashboard.syncCurrentViewers = function(data) {
		if (!data.channelId || !data.viewers) {
			return false;
		}
		var userList = dashboard.featuredUsers ? dashboard.users.concat(dashboard.featuredUsers) : dashboard.users;
		for (var user in userList) {
			if (userList[user].userId == data.channelId) {
				currentBroadcast.channelId = data.channelId;
				userList[user].viewers = Api.squashedNumber(data.viewers, 3);
				currentBroadcast.viewers = userList[user].viewers;
				break;
			}
		}
	};

	dashboard.filterTrending = function(userId) {
		for (var i = 0; i < dashboard.users.length; i++) {
			if (userId == dashboard.users[i].userId) {
				dashboard.users.splice(i, 1);
			}
		}
	};

	dashboard.filterUsers = function(userId) {
		for (var i = 0; i < dashboard.users.length; i++) {
			dashboard.users[i].userlevel = parseFloat(dashboard.users[i].userlevel);
			dashboard.users[i].thumb = getBroadcastThumb(dashboard.users[i]);
		}
	};

	dashboard.fetchTrendingBroadcasts = function() {
		var defer = $q.defer();
		var i = 0;
		var trendingUsers = [];
		return Api.get('younow/dashboard/mobile', {
			topicsEnabled: 1,
			trending: 30,
			featured: 30,
			locale: config.UILocale
		}, true).then(function(response) {
			if (response.data && response.data.errorCode === 0 && response.data.trending_tags.length > 0) {
				for (i; i < response.data.trending_tags.length; i++) {
					var broadcast = response.data.trending_tags[i].items[0];
					broadcast.totalFans = parseInt(response.data.trending_tags[i].items[0].totalFans);
					trendingUsers.push(broadcast);
				}
				defer.resolve(trendingUsers);
			} else {
				defer.reject();
			}
			return defer.promise;
		});
	};

	dashboard.getTrending = function() {
		getTrending();
	};

	return dashboard;

}])

;
