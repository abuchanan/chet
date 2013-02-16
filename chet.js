// TODO http://codereview.stackexchange.com/
//      http://jsfiddle.net/IgorMinar/ADukg/
//      http://jsfiddle.net/pkozlowski_opensource/hzxNa/1/

// NOTE always namespace directives.  I spent an hour figuring out that <track> was buggy because it's an existing HTML tag
//      would be nice to have something that checks directives and warns about this


angular.module('Chet', []).
  directive('chetDynamicTrack', ['$compile', function($compile) {
    return {
      restrict: 'E',

      // TODO allowing transcluded content should be possible
      //transclude: true,

      scope: {
        config: '=',
      },

      link: function(scope, elem, attrs, ctrl) {
        // TODO a better way to define these transformations.  needs to be modular.
        if (scope.config.type == 'chet-gene-track') {
          var c = $compile("<chet-gene-track position='config.position' server='config.server'></chet-gene-track>")(scope);
          elem.html(c);
        }

      },
    };
  }]).
  // TODO allow the track wrapper to be augmented
  //      e.g. the track wrapper defines a toolbar, and the custom track wants
  //           to add a custom button to the toolbar.  Possibly this is similar
  //           to the tabs/panes example, where the pane calls a function on the 
  //           parent controller.
  directive('chetTrack', function($compile) {
    return {
      restrict: 'E',
      templateUrl: 'track.html',
      transclude: true,
      replace: true,
      link: function(scope, elem, attrs, controller) {
        console.log('track link');
      },
    };
  }).
  directive('chetGeneTrack', function() {
    return {
      restrict: 'E',
      templateUrl: 'gene_track.html',
      controller: 'GeneTrackCtrl',

      scope: {
        position: '=',
        server: '=',
      },

      link: function(scope, element, attrs, controller) {

        // TODO watching position and server will be a basic operation for most tracks
        //      make it easy to abstract this away from the track code
        scope.$watch('[server, position]', function(server) {
          controller.refresh();
        }, true);
      },
    };
  }).
  directive('chetCoverageTrack', function() {
    return {
      restrict: 'E',
      templateUrl: 'coverage_track.html',
      controller: function($scope) {

          $scope.points = [];
          $scope.$watch('position', function(position) {
              var res = $scope.server.getCoverageForInterval(position);

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
          }, true);
      },

      scope: {
        position: '=',
        server: '=',
      },
    };
  }).
  directive('chetCoverageCanvasControl', function() {
    return {
      require: '^chetCoverageTrack',
      scope: {
        points: '=',
      },
      link: function(scope, elem, attrs, ctrl) {

          var canvas = elem[0];
          var ctx = canvas.getContext('2d');

          scope.$watch('points', function(pts) {

              // TODO dynamic canvas dimensions
              ctx.clearRect(0, 0, 300, 200);
              var width = 300;

              ctx.beginPath();

              ctx.moveTo(0, 100);

              angular.forEach(pts, function(pt) {
                  // TODO normalize pt to height/scale of canvas
                  ctx.lineTo(pt.x, pt.y);
              });

              ctx.lineTo(width, 100);
              ctx.lineTo(0, 100);
              ctx.fill();
          });
      },
    }
  }).
  directive('chetZoomer', function() {
    return {
      restrict: 'E',
      scope: {
        position: '=',
      },
      templateUrl: 'zoomer.html',
      link: function(scope, elem, attrs, ctrl) {
        scope.zoomOut = function() {
          // TODO zoom function on position?
          scope.position.start -= 10;
          scope.position.end += 10;
        }

        scope.zoomIn = function() {
          // TODO zoom function on position?
          scope.position.start += 10;
          scope.position.end -= 10;
        }
      },
    }
  }).
  directive('chetDragPosition', function() {
    return {
      // TODO this one might be useful as an attribute
      restrict: 'E',
      transclude: true,
      scope: {
        position: '=',
      },
      templateUrl: 'position_drag.html',
      controller: function($scope, $document) {

          var dragging = false;
          var pos = 0;

          $scope.startDrag = function(e) {
            dragging = true;
            pos = e.clientX;
          }

          // TODO I wonder how inefficient this is...
          //      how efficient is refreshing every time this event is fired?
          //      should refresh be on an interval loop?
          $document.bind('mousemove', function(e) {
              if (dragging) {
                // Use $apply to execute this DOM event within Angular's digest cycle.
                $scope.$apply(function(s) {
                    s.position.shift(pos - e.clientX);
                });
                pos = e.clientX;
              }
          });

          $document.bind('mouseup', function(e) {
              dragging = false;
          });
      },
    };
  });


function GeneTrackCtrl($scope, $log) {

  $scope.levels = [];

  this.refresh = function() {

    var position = $scope.position;
    var genes = $scope.server.getGenesInInterval(position);

    var levels = [];

    for (var i = 0; i < genes.length; i++) {
        var gene = genes[i];
        gene.level = 0;

        // TODO at some point, you're so zoomed out that maybe packing matters less
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
        //      Maybe I can pull the _intended_ height from the CSS height property
        //      of some (possibly invisible) element, and use JS to set it here.
        //      At least that way, the height would be configurable via CSS rules.
        //      Otherwise, the height needs to be configured via JS.
        level.style.height = '20px';
    }

    $scope.levels = levels;
  }
}

function ChetPosition(ref, start, end) {
  this.ref = ref;
  this.start = start;
  this.end = end;
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

function ChetCtrl($scope, $document, $log) {

  $scope.pos = new ChetPosition('ref1', 0, 700);

  $scope.tracks = [
    {type: 'chet-gene-track', server: serverA, position: $scope.pos},
    {type: 'chet-gene-track', server: serverB, position: $scope.pos},
  ];

  $scope.addTrack = function() {
    var t = {type: 'chet-gene-track', server: serverB, position: $scope.pos};
    $scope.tracks.push(t);
  }

  $scope.static_config = {server: serverA};
  $scope.static_config_B = {server: serverB};
  $scope.static_config_C = {server: serverC};
}


var DummyGeneServer = function(genes) {

    // TODO server should do caching.

    // TODO ensure that genes are sorted by start position
    this.getGenesInInterval = function(position) {

        var ret = [];

        if (genes[position.ref]) {
          for (var i = 0; i < genes[position.ref].length; i++) {
            var gene = genes[position.ref][i];
            if (gene.start <= position.end && gene.end >= position.start) {
                ret.push(gene);
            }
          }
        }

        return ret;
    }
}

var serverA = new DummyGeneServer({
  'ref1': [
    {start: 50, end: 70},
    {start: 60, end: 80},
    {start: 90, end: 100},
    {start: 500, end: 570},
    {start: 1500, end: 1570},
  ],
  'ref2': [
    {start: 40, end: 90},
    {start: 60, end: 80},
    {start: 200, end: 570},
    {start: 1500, end: 1570},
  ],
});

var serverB = new DummyGeneServer({
  'ref1': [
    {start: 50, end: 70},
    {start: 60, end: 80},
  ],
  'ref2': [
    {start: 40, end: 90},
    {start: 60, end: 80},
  ],
});

function DummyCoverageServer() {
    var max = 100;
    var min = 30;
    var count = 1000;
    var interval = 10;

    var all_coverage = [];
    for (var i = 0; i < count; i++) {
        var pt = Math.floor((Math.random() * (max - min + 1)) + min);
        all_coverage.push(pt);
    }

    this.getCoverageForInterval = function(position) {
        // TODO doesn't handle position outside range of data
        //      e.g. negative start position

        // TODO these calculations are likely wrong, I put 1 second of thought into them
        var start = Math.floor(position.start / interval);
        // TODO shouldn't this be ceiling?
        var end = Math.floor(position.end / interval);
        return {
          start: start * interval,
          end: end * interval,
          interval: interval,
          points: all_coverage.slice(start, end),
        }
    }
}

var serverC = new DummyCoverageServer();
