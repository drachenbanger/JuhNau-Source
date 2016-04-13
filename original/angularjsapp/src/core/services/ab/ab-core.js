(function() {
	angular.module('younow.core.services')
		/**
		 * @ngdoc directive
		 * @name ab
		 * @requires ab
		 * @restrict E
		 * @description
		 *
		 * Loads templates on the fly depending on the ab variation (used in conjunction with the ab service).
		 *
		 */
		.directive('ab', ["ab", "$http", "$compile", "$templateCache", function(ab, $http, $compile, $templateCache) {
			return {
				restrict: 'AE',
				// Set variables to scope for use by the templates
				link: function(scope, elem, attrs, controller) {
					var template = "angularjsapp/src/" + ab.app + "/services/ab/" + attrs.id + ".tpl.html";
					var tpl = $templateCache.get(template);
					if (tpl === undefined) {
						$http.get(template).then(function(response) {
							tpl = $compile(response.data)(scope);
							elem.append(tpl);
						});
					} else {
						elem.append(tpl);
					}
					var experiment = ab.experiments[attrs.id];
					var split = ab.variant(attrs.id);
					scope.abexperiment = attrs.id;
					scope.abvariant = split;
					if (experiment.variants && experiment.variants[split]) {
						scope.abvalue = experiment.variants[split];
					}
					elem.addClass('ab-' + attrs.id);
					elem.addClass('ab-' + attrs.id + '-' + split);
				}
			};
		}])

	/**
	 * @ngdoc object
	 * @name AbCore
	 * @description
	 *
	 * This is the base logic for the ab service: a front end service that encapsulates the experiments and their variations in one easy to read and maintain location.
	 *
	 */
	.factory('AbCore', function($location, ApiCore) {
		var AbCore = {};
		var params = $location.search();
		var Api;

		/**
		 * @ngdoc
		 * @name AbCore.Base
		 * @methodOf AbCore
		 * @param {object} options An object of options that can be passed into the app. They currently consist of the following:
		 * @param {string} app mobile or desktop, used to change the directory of the templates.
		 * @param {string} app version, taken from the config versioning system.
		 * @param {object} experiments An object consisting of the experiments defined in the app currently.
		 * @param {object} config The app's config object.
		 * @param {object} BEexperiments All experiments run by the backend (optional).
		 * @param {function} captureCallback The app's trackingPixel.capture function.
		 * @description
		 *
		 * The Base method of the ApiCore is the standard way we initialize services. It returns an object which should then extend the functionality of the
		 * app's Api (utility) service. The object has a bounty of useful reusable helper functions as documented below. Remember to extend this core object onto the apps custom one.
		 *
		 * @example
		  ```
			var core = new AbCore.Base({
				app: 'desktop',
				config: config,
				experiments: experiments,
				captureCallback: trackingPixel.capture
			});

			var ab = angular.extend(core, {});
		  ```
		*/
		AbCore.Base = function(options) {
			"use strict";
			if (!(this instanceof AbCore.Base)) {
				throw new Error("abCore.Base needs to be called with the new keyword");
			}
			if (!options.experiments) {
				throw new Error('An experiments option is required for the abCore');
			}
			if (!options.app) {
				throw new Error('An app option (mobile or desktop) must be specified');
			}
			if (!options.captureCallback) {
				throw new Error('A captureCallback option must be specified for tracking');
			}
			if (options.app == 'mobile') {
				this.app = 'mobile';
			} else {
				this.app = 'app';
			}

			//inject an instance of Api to use only in this core constructor
			Api = new ApiCore.Base(options.config);

			this.experiments = options.experiments;

			this.variant = function(id, conditionsMap) {
				/**
				 * @ngdoc
				 * @name AbCore.variant
				 * @methodOf AbCore
				 * @param {string} Id of the experiment which maps to a list of its variants.
				 * @description
				 *
				 * This method is used to determine which variant of the experiment to give the user. Below are a list of the steps that it goes through before deciding the users fate:
				 *
				 * 1. Is there an override in the URL?
				 * 2. Is it coming from the backend?
				 * 3. Is it being overridden?
				 * 4. Is it set in localstorage (local)?
				 * 5. Does this device qualify?
				 * 6. Should this device participate?
				 * 7. Still not set? > roll the dice!
				 *
				 * If you'd like to override this service and force a variant use a search query like this: ?ab_ID_OF_EXPERIMENT=VARIANT_LABEL (e.g.: ?ab_invite=a)
				 *
				 */
				var experiment = this.experiments[id];
				// 1. Is there an override in the URL?
				if (params['ab_' + id]) {
					return params['ab_' + id];
				}

				// 2. Is it coming from the backend?
				if (experiment.backendExperiment) {
					return options.BEexperiments && options.BEexperiments[id] ? options.BEexperiments[id] : experiment.na;
				}

				// 3. Is it being overridden?
				if (experiment.variantOverload) {
					return experiment.variantOverload;
				}
				// 4. Is it set in localstorage (local)?
				if (Api.store('ab_' + id)) {
					var local = Api.store('ab_' + id);
					return (local == 'na') ? 'control' : local; // return control for non-participants
				}
				// 5. Does this device qualify?
				var conditions = experiment.selectionAttributes;
				if (conditions) {
					if (conditionsMap) {
						for (var item in conditionsMap) {
							if (item !== 'newVisitor' && conditionsMap[item] != conditions[item]) {
								Api.store('ab_' + id, 'na');
								return 'control';
							}
						}
					}
					if (conditions.newVisitor && !window.newVisitor) {
						Api.store('ab_' + id, 'na');
						return 'control';
					}
				}

				// 6. Should this device participate?
				if (Math.random() * 100 > experiment.trafficAllocation) {
					Api.store('ab_' + id, 'na');
					return 'control';
				}

				// 7. Still not set? > roll the dice!
				var split;
				if (!Array.isArray(experiment.variants)) {
					var variants = [];
					for (var variant in experiment.variants) {
						variants.push(variant);
					}
					split = variants[Math.floor((Math.random() * 100) / (100 / variants.length))];
				} else {
					split = experiment.variants[Math.floor((Math.random() * 100) / (100 / experiment.variants.length))];
				}
				Api.store('ab_' + id, split);
				options.captureCallback({
					event: 'JOINED_EXPERIMENT',
					extradata: id,
					field1: split,
					field2: experiment.version,
					field3: options.app_version
				});
				return split;
			};
		};

		return AbCore;

	})

	;
})();
