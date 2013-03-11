'use strict';

/*
  TODO don't allow the start to be greater than the end
       i.e. the width should have a min. allowed value
*/
function ChetPosition(ref, start, end, max) {
  this.ref = ref;
  this.start(start);
  this.end(end);
  // TODO maybe max doesn't make sense in this class?
  this.max = max;
}
ChetPosition.prototype = {
    width: function() {
      return this.end() - this.start();
    },
    start: function(val) {
      if (val) {
        if (val >= this.end()) {
          throw new Exception('Invalid start value');
        }
        this._start = val;
      }
      return this._start;
    },
    end: function(val) {
      if (val) {
        if (val <= this.start()) {
          throw new Exception('Invalid end value');
        }
        this._end = val;
      }
      return this._end;
    },
    shift: function(amount) {
      var w = this.width();
      this.start(this.start() + amount);
      this.end(this.start() + w);
    },
    shiftTo: function(position) {
      var w = this.width();
      this.start(position);
      this.end(this.start() + w);
    }
};


function InstancesCtrl($scope, Instance) {
  $scope.instances = Instance.query();
}

function InstanceSettingsCtrl($scope) {
}


function InstanceCtrl($routeParams, $scope, $location, Instance, Presets) {

  // TODO handle when instance ID doesn't exist
  var instance = Instance.get({instanceID: $routeParams.instanceID}, function() {
    $scope.tracks = instance.tracks;
  });

  $scope.instanceID = $routeParams.instanceID;

  var pos = new ChetPosition('ref1', 25000, 50000);
  $scope.pos = pos;

  $scope.$watch('pos', function(pos) {
    $scope.raw_position = pos.ref + ' ' + pos.start + '-' + pos.end;
  }, true);

  $scope.updatePos = function() {
    // TODO there is a bug in this position changer.  try changing 10000 to 50000 by replacing the 1 with a 5. because it becomes zero
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

function GeneTrackCtrl($scope, Genes) {

    $scope.levels = [];

    var position = $scope.position;

    function draw(genes) {

        var levels = [];
        for (var i = 0; i < genes.length; i++) {
            var gene = genes[i];
            gene.level = 0;

            // TODO at some point, you're so zoomed out
            //      that maybe packing matters less
            //      and having multiple levels isn't helpful
            for (var j = i - 1; j >= 0; j--) {
                var prev = genes[j];

                if (prev.start <= gene.end && prev.end >= gene.start) {
                    gene.level++;
                } else {
                    gene.level = prev.level;
                }
            }

            while (gene.level >= levels.length) {
                levels.push({
                  boxes: [],
                  style: {},
                });
            }

            var level = levels[gene.level];

            var box = {
              style: {
                left: (((gene.start - position.start) / position.width) * 100) + '%',
                width: (((gene.end - gene.start) / position.width) * 100) + '%',
              },
            };


            level.boxes.push(box);

            // TODO this kind of sucks.  I have to set the height of a level div
            //      in JS because its children are absolute positioned.  I haven't
            //      found any elegant way around this.
            //      Maybe I can pull the _intended_ height from the CSS height
            //      property
            //      of some (possibly invisible) element, and use JS to set it here.
            //      At least that way, the height would be configurable via
            //      CSS rules.
            //      Otherwise, the height needs to be configured via JS.
            level.style.height = '20px';
        }

        $scope.levels = levels;
    }

    function refresh() {

        // TODO I don't like this.  this stuff should be part of track
        //      initialization
        var sizes = Genes.sizes({db: $scope.track.server}, function() {
            var ref = $scope.position.ref;
            if (ref in sizes) {
                $scope.position.max = sizes[ref];
            }
        });

        var q = {
            db: $scope.track.server,
            ref: $scope.position.ref,
            start: $scope.position.start,
            end: $scope.position.end,
        };
        var genes = Genes.query(q, function() {
          draw(genes);
        });
    }

    // TODO watching position and server will be a basic operation for most tracks
    //      make it easy to abstract this away from the track code
    // TODO there's probably a lot more things that will need to be watched
    $scope.$watch('[track.server, position]', refresh, true);
}


function CoverageTrackCtrl($scope, Coverage) {

    $scope.points = [];

    var position = $scope.position;

    // TODO should be watching server too
    $scope.$watch('position', function() {

        var q = {
            db: $scope.track.server,
            ref: $scope.position.ref,
            start: $scope.position.start,
            end: $scope.position.end,
        };
        var res = Coverage.get(q, function() {

            var points = [];
            angular.forEach(res.points, function(pt, i) {

                var pt_x = res.start + (i * res.interval);
                var x = pt_x - position.start;

                points.push({
                    x: x,
                    y: pt,
                });
            });

            $scope.points = points;
        });

    }, true);
}
