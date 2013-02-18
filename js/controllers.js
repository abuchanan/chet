

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
// TODO I always forget, is there something missing from this style of inheritance?
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

function InstancesCtrl() {}

function InstanceCtrl($routeParams, $scope, $document, $log, Instance) {

  var instance = Instance.get({instanceID: 1}, function() {
    $scope.tracks = instance.tracks;
  });

  $scope.pos = new ChetPosition('ref1', 0, 700);

  // TODO this is dummy code.  should actually save to Instance
  $scope.addTrack = function() {
    $scope.tracks.push({
        type: 'chet-gene-track',
        server: 'serverB'
    });
  }
}
