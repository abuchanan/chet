'use strict';


/*
  TODO don't allow the start to be greater than the end
       i.e. the width should have a min. allowed value
*/
function ChetPosition(ref, start, end) {
  this.ref = ref;
  this.start = start;
  this.end = end;
  this.max = 8000;
}
ChetPosition.prototype = {
    get width() {
      return this.end - this.start;
    },
    shift: function(amount) {
      var w = this.width;
      this.start += amount;
      this.end = this.start + w;
    }
};


function InstancesCtrl($scope, Instance) {
  $scope.instances = Instance.query();
}


function InstanceCtrl($routeParams, $scope, $location, Instance, Presets) {

  // TODO handle when instance ID doesn't exist
  var instance = Instance.get({instanceID: $routeParams.instanceID}, function() {
    $scope.tracks = instance.tracks;
  });

  var pos = new ChetPosition('ref1', 0, 700);
  $scope.pos = pos;

  $scope.availableTracks = Presets.query(function() {
    $scope.selectedAddTrack = $scope.availableTracks[0];
  });

  $scope.linkHere = function() {
    var d = $location.search();
    d.ref = pos.ref;
    d.start = pos.start;
    d.end = pos.end;
    var j = [];
    angular.forEach(d, function(v, k) {
      j.push(k + '=' + v);
    });
    var s = '?' + j.join('&');

    var url = '//' + $location.host();
    var port = $location.port();
    if (port) {
      url += ':' + $location.port()
    }
    url += $location.path() + s + $location.hash();
    console.log(url);
  }

  // TODO this is dummy code.  should actually save to Instance
  $scope.addTrack = function() {
    $scope.tracks.push($scope.selectedAddTrack);
  }
}
