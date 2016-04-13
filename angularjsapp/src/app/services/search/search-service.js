angular.module('younow.services.search', [])

.factory('searchService', ["Api", function(Api) {

	var service = {};

	service.getItems = function(query, numberOfRecords) {
		query = query || '';
		if (!service.results || query !== service.query) {
			service.results = [];
		}
		service.query = query;

		var params = {
			numberOfRecords: numberOfRecords || 20,
			startFrom: service.results.length || 0
		};
		var method;

		if (!query) {
			method = "younow/trendingUsers";
		} else {
			method = "younow/search";
			params.s = query;
		}

		return Api.get(method, params).success(function(data) {
			if (!query) {
				angular.forEach(data.trending_users, function(user, i) {
					user.tags = user.tags[0];
					user.profileUrlString = user.profile;
					user.statusId = 2;
					user.level = Math.round(user.userlevel);
				});
				service.results = service.results.concat(data.trending_users);
				data.totalUsers = data.total;
			} else {
				service.results = service.results.concat(data.users);
			}
			if (service.results.length >= data.totalUsers) {
				service.finished = true;
			}
		});

	};

	return service;

}])

;
