angular.module('ChetServices', ['ngResource']).

  factory('Genes', function($resource) {
    return $resource('genes/:db');
  }).

  factory('Coverage', function($resource) {
    return $resource('coverage/:db');
  }).

  // TODO better name than instance
  factory('Instance', function($resource) {
    return $resource('instance/:instanceID');
  });
