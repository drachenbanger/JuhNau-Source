angular.module('younow.seach-bar', [])

.directive('ynSearchBar', ["$state", "$location", "Api", "broadcasterService", "session", "config", "$translate", "trpx", "$timeout", function($state, $location, Api, broadcasterService, session, config, $translate, trpx, $timeout) {
	return {
		restrict: 'E',
		templateUrl: 'angularjsapp/src/app/components/search-bar/search-bar.tpl.html',
		scope: {
			type: '@'
		},
		link: function(scope, element, attrs) {
			var trackingState = {
				lastQuery: '',
				algoliaResults: [],
				tagResults: []
			};

			scope.search = {};
			scope.search.cdn = config.settings.ServerCDNBaseUrl;
			scope.search.searching = false;

			$translate('search_placeholder_home').then(function(translated) {
				scope.search_placeholder_home = translated;
			});
			$translate('search_placeholder_site').then(function(translated) {
				scope.search_placeholder_site = translated;
			});

			scope.search.query = function(query) {
				scope.search.searching = true;
				var restrict = query.substr(0, 1) === "#" ? "tag" : false;
				if (restrict) {
					query = query.substr(1);
				}
				trackingState.lastQuery = query;
				return Api.algolia(query, restrict).then(function(response) {
					scope.search.searching = false;
					var results = response.data.hits || [];
					angular.forEach(results, function(user, i) {
						user.fullName = Api.fullName(user);
						user.hashedDescription = Api.convertEmoji(user.description);
					});
					trackingState.algoliaResults = results;
					return Api.get('younow/tags', {
							s: query
						}, true)
						.then(function(response) {
							if (response.data.tags && response.data.tags.length > 0) {
								if (restrict) {
									results = response.data.tags.slice(0, 4).concat(results);
									results.push({
										more: true,
										profile: '#' + query,
										tag: query
									});
								} else {
									results = results.concat(response.data.tags.slice(0, 4));
									results.push({
										more: true,
										profile: query,
										query: query
									});
								}
								trackingState.tagResults = response.data.tags.slice(0, 4);
							} else {
								results.push({
									more: true,
									profile: query,
									query: query
								});
							}
							return results;
						});
				});
			};

			scope.search.selectResult = function($item, $model, $label) {
				trackingState.selectionMade = true;
				var searchData = {
					event: 'SEARCH_CLICK',
					query: trackingState.lastQuery
				};
				broadcasterService.channelSwitch = "SEARCH";
				if ($item.objectID) {
					$location.path($item.profile);
					searchData.click_field = $model.tag && $model.tag.length > 0 ? 'USER_BROADCAST' : 'USER_PROFILE';
				} else if ($item.tag && $state.current.name !== 'main.explore') {
					$state.go('main.explore', {
						tag: $item.tag
					});
					searchData.click_field = 'TAGS';
				} else if ($item.tag && $state.current.name === 'main.explore') {
					$state.go('main.explore', {
						tag: $item.tag,
						q: undefined
					}, {
						reload: true
					});
					searchData.click_field = 'TAGS';
				} else {
					$state.go('main.explore', {
						q: $item.profile,
						tag: undefined
					});
					searchData.click_field = 'ALLRESULTS';
				}
				scope.search.searchBox = '';
				if (searchData.click_field == 'USER_BROADCAST' || searchData.click_field == 'USER_PROFILE') {
					searchData = formatData('algoliaResults', $item, searchData);
				} else if (searchData.click_field == 'TAGS') {
					searchData = formatData('tagResults', $item, searchData);
				}
				trackingState.lastQuery = '';
				trpx.capture(searchData, trpx.captureGroups.searchevents);
			};

			scope.search.background = function(id, type, refresher) {
				type = type || 'Image';
				var extra = type == 'Image' ? ', url(' + config.settings.ServerCDNBaseUrl + '/images/nothumb.jpg)' : '';
				refresher = refresher || '';
				var base = session.user && session.user.userId == id ? config.settings.ServerLocalBaseUrl : config.settings.ServerCDNBaseUrl;
				return 'background:url(' + base + '/php/api/channel/get' + type + '/channelId=' + id + refresher + ')' + extra + ' no-repeat center center; background-size: cover;';
			};

			scope.search.trackBlur = function(trackingEvent, trackingField) {
				if (trackingState.abandonEventTimer) {
					$timeout.cancel(trackingState.abandonEventTimer);
				}
				trackingState.abandonEventTimer = $timeout(function() {
					if (trackingState.selectionMade || trackingState.lastQuery.length === 0) {
						trackingState.selectionMade = false;
						return false;
					}
					trpx.capture({
						event: trackingEvent || 'SEARCH_ABANDON',
						click_field: trackingField || '',
						query: trackingState.lastQuery
					}, trpx.captureGroups.searchevents);

					trackingState.lastQuery = '';
					trackingState.abandonEventTimer = undefined;
				}, 2000);
			};

			scope.goToExplore = function() {
				if (trackingState.abandonEventTimer) {
					scope.search.trackBlur('SEARCH_CLICK', 'ALLRESULTS');
				}
				$state.go('main.explore', {
					q: scope.search.searchBox
				});
			};

			function formatData(list, $item, data) {
				data.result_set_size = list == 'algoliaResults' ? trackingState[list].length - 1 : trackingState[list].length;
				list = trackingState[list];
				var identifier = $item.objectID ? 'objectID' : 'tag';
				for (var i = 0; i < list.length; i++) {
					if (list[i][identifier] == $item[identifier]) {
						data.click_index = i;
						break;
					}
				}
				return data;
			}
		}
	};
}])

;
