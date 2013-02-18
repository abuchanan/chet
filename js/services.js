angular.module('ChetServices', ['ngResource']).

  // TODO list available databases
  //      how does this work across genes and coverage and whatever else?

  factory('Presets', function($resource) {
    return $resource('presets');
  }).

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
