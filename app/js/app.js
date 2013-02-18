'use strict';


angular.module('chet', ['chet.services', 'chet.directives']).
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
      otherwise({redirectTo: '/instances'});
  });
