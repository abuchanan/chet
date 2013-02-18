// TODO http://codereview.stackexchange.com/
//      http://jsfiddle.net/IgorMinar/ADukg/
//      http://jsfiddle.net/pkozlowski_opensource/hzxNa/1/

// NOTE always namespace directives.  I spent an hour figuring out that <track> was buggy because it's an existing HTML tag
//      would be nice to have something that checks directives and warns about this


angular.module('Chet', ['ChetServices', 'ChetDirectives']).
  config(function($routeProvider) {
    $routeProvider.
      when('/instances', {
        templateUrl: 'templates/instances.html',
        controller: InstancesCtrl,
      }).
      when('/instance/:instanceID', {
        templateUrl: 'templates/instance.html', 
        controller: InstanceCtrl,
      }).
      otherwise({redirectTo: '/instances'});
  });
