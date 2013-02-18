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


function InstanceCtrl($routeParams, $scope, Instance, Presets) {

  // TODO handle when instance ID doesn't exist
  var instance = Instance.get({instanceID: $routeParams.instanceID}, function() {
    $scope.tracks = instance.tracks;
  });

  $scope.pos = new ChetPosition('ref1', 0, 700);

  $scope.availableTracks = Presets.query(function() {
    $scope.selectedAddTrack = $scope.availableTracks[0];
  });

  // TODO this is dummy code.  should actually save to Instance
  $scope.addTrack = function() {
    $scope.tracks.push($scope.selectedAddTrack);
  }
}
