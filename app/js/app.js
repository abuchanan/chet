'use strict';


angular.module('chet', ['chet.filters', 'chet.services', 'chet.directives']).
  config(function($routeProvider) {
    $routeProvider.
      when('/instances', {
        templateUrl: 'partials/instances.html',
        controller: InstancesCtrl,
      }).
      when('/instance/:instanceID', {
        templateUrl: 'partials/instance.html', 
        controller: InstanceCtrl,
      }).
      when('/instance/:instanceID/settings', {
        templateUrl: 'partials/instance_settings.html', 
        controller: InstanceSettingsCtrl,
      }).
      otherwise({redirectTo: '/instances'});
  });
