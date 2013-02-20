'use strict';


/*
  TODO don't allow the start to be greater than the end
       i.e. the width should have a min. allowed value
*/
function ChetPosition(ref, start, end) {
  this.ref = ref;
  this.start = start;
  this.end = end;
  // TODO this is an arbitrary
  this.max = 8000;
}
ChetPosition.prototype = {
    get width() {
      return this.end - this.start;
    },
    maxHint: function(max) {
      this.max = Math.max(max, this.max);
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

  var pos = new ChetPosition('Chr1', 2000, 10000);
  $scope.pos = pos;

  $scope.$watch('pos', function(pos) {
    $scope.raw_position = pos.ref + ':' + pos.start + '-' + pos.end;
  }, true);

  $scope.updatePos = function() {
    // TODO define proper regex for reference name
    var m = $scope.raw_position.match(/^([a-zA-Z0-9]+):(\d+)-(\d+)$/);
    if (m) {
      $scope.pos.ref = m[1];
      $scope.pos.start = parseInt(m[2]);
      $scope.pos.end = parseInt(m[3]);
    }
  }

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
