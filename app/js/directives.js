'use strict';


angular.module('chet.directives', []).


  directive('chetDynamicTrack', ['$compile', function($compile) {
    return {
      restrict: 'E',
      scope: {
        position: '=',
        config: '=',
      },

      link: function(scope, elem, attrs, ctrl) {
        // TODO a better way to define these transformations.  needs to be modular.
        //      think about the angular services/provider/DI way and how that could
        //      be applied here.

        // TODO 'server' attr or more general 'config' attr?

        var tpl = '';

        if (scope.config.type == 'chet-gene-track') {
          tpl = "<chet-gene-track position='position' server='{{ config.server }}' name='{{ config.name }}'></chet-gene-track>";
        }

        else if (scope.config.type == 'chet-coverage-track') {
          tpl = "<chet-coverage-track position='position' server='{{ config.server }}' name='{{ config.name }}'></chet-coverage-track>";
        }

        var c = $compile(tpl)(scope);
        elem.html(c);

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
      templateUrl: 'partials/track.html',
      transclude: true,
      scope: {
        label: '@',
      },
      controller: function($scope) {
        $scope.showSettings = false;
        $scope.toggleSettings = function() {
          $scope.showSettings = !$scope.showSettings;
        }
      },
    };
  }).


  directive('chetOverview', function($compile) {
    return {
      restrict: 'E',
      templateUrl: 'partials/overview.html',
      scope: {
        position: '=',
      },
      controller: function($scope, $element, $document, $timeout) {

          var dragging = false;
          var panning_left = false;
          var panning_right = false;

          // TODO increase pan_amount with time mouse is held down
          var pan_amount = 10;
          var pan_delay = 50;

          var pos = 0;
          // TODO try an draggable overview strip that constantly pans
          //      instead of the absolute pan. distance from initial mousedown
          //      determines velocity of pan

          // TODO shifted position needs to be relative to the scale of the viewer
          //      e.g. 1 px on a 1 to 1 million scale is a bigger jump than
          //           1 px on a 1 to 1000 scale.
          $scope.startPanDrag = function(e) {
            dragging = true;
            pos = e.clientX;
          }

          function panLeft() {
              if (panning_left) {
                  $scope.position.shift(pan_amount * -1);
                  $timeout(panLeft, pan_delay);
              }
          }

          $scope.startPanLeft = function() {
              panning_left = true;
              panLeft();
          }

          function panRight() {
              if (panning_right) {
                  $scope.position.shift(pan_amount);
                  $timeout(panRight, pan_delay);
              }
          }

          $scope.startPanRight = function() {
              panning_right = true;
              panRight();
          }

          // TODO I wonder how inefficient this is...
          //      how efficient is refreshing every time this event is fired?
          //      should refresh be on an interval loop?
          $document.bind('mousemove', function(e) {

              if (dragging) {

                // Use $apply to execute this DOM event within Angular's digest cycle.
                $scope.$apply(function(s) {

                    var p = (pos - e.clientX) / $element.width();
                    var d = Math.floor(s.position.width * p);
                    s.position.shift(d * -1);
                });

                pos = e.clientX;
              }
          });

          $document.bind('mouseup', function(e) {
              dragging = false;
              panning_left = false;
              panning_right = false;
          });
      },
      link: function(scope, elem, attrs, controller) {
        scope.$watch('position', function(position) {

            var start = Math.floor(position.start / position.max * 100);
            var end = Math.floor(position.end / position.max * 100);
        }, true);
      },
    };
  }).


  directive('chetGeneTrack', function() {
    return {
      restrict: 'E',
      templateUrl: 'partials/gene_track.html',
      scope: {
        position: '=',
        server: '@',
        name: '@',
      },
      controller: function($scope, Genes) {

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

          this.refresh = function() {

            // TODO I don't like this.  this stuff should be part of track
            //      initialization
            var sizes = Genes.sizes({db: $scope.server}, function() {
                var ref = $scope.position.ref;
                if (ref in sizes) {
                    $scope.position.maxHint(sizes[ref]);
                }
            });

            var q = {
                db: $scope.server,
                ref: $scope.position.ref,
                start: $scope.position.start,
                end: $scope.position.end,
            };
            var genes = Genes.query(q, function() {
              draw(genes);
            });
          }
      },

      // TODO should I merge this into the controller?
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
      templateUrl: 'partials/coverage_track.html',
      scope: {
        position: '=',
        server: '@',
        name: '@',
      },
      controller: function($scope, Coverage) {

          $scope.points = [];
          // TODO should be watching server too
          $scope.$watch('position', function(position) {

              var q = {
                  db: $scope.server,
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
      },
    };
  }).


  directive('chetCoverageCanvasControl', function() {
    return {
      require: '^chetCoverageTrack',
      scope: {
        // TODO I don't like that I have to pass in position here
        //      especially because it's passed into the parent control too
        position: '=',
        points: '=',
      },
      link: function(scope, elem, attrs, ctrl) {

          var canvas = elem[0];
          canvas.width = canvas.clientWidth;
          canvas.height = canvas.clientHeight;
          var ctx = canvas.getContext('2d');

          scope.$watch('points', function(pts) {

              ctx.clearRect(0, 0, canvas.width, canvas.height);

              if (pts.length > 0) {
                  ctx.beginPath();

                  var first_x = (pts[0].x / scope.position.width) * canvas.width;
                  ctx.moveTo(first_x, canvas.height);

                  var y_max = 0;
                  angular.forEach(pts, function(pt) {
                      if (pt.y > y_max) {
                          y_max = pt.y;
                      }
                  });

                  var last_x = canvas.width;
                  angular.forEach(pts, function(pt) {
                      var x = (pt.x / scope.position.width) * canvas.width;
                      var y = canvas.height - ((pt.y / y_max) * canvas.height);
                      last_x = x;
                      ctx.lineTo(x, y);
                  });

                  ctx.lineTo(last_x, canvas.height);
                  ctx.lineTo(first_x, canvas.height);
                  ctx.fill();
              }
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
      templateUrl: 'partials/zoomer.html',
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


  // TODO this could ditch the template and just act on the element which it's attached to
  directive('chetDragPosition', function() {
    return {
      // TODO this one might be useful as an attribute
      restrict: 'E',
      transclude: true,
      scope: {
        position: '=',
      },
      templateUrl: 'partials/position_drag.html',
      controller: function($scope, $document, $element) {

          var dragging = false;
          var pos = 0;

          $scope.startDrag = function(e) {
            dragging = true;
            pos = e.clientX;
          }

          // TODO I wonder how inefficient this is...
          //      how efficient is refreshing every time this event is fired?
          //      should refresh be on an interval loop?
          // TODO duplicated code with overview
          $document.bind('mousemove', function(e) {

              if (dragging) {

                  // Use $apply to execute this DOM event within Angular's digest cycle.
                  $scope.$apply(function(s) {

                      var p = (pos - e.clientX) / $element.width();
                      var d = Math.floor(s.position.width * p);
                      s.position.shift(d);
                  });
                  pos = e.clientX;
              }
          });

          $document.bind('mouseup', function(e) {
              dragging = false;
          });
      },
    };
  }).
  directive('chetRuler', function() {
      return {
          restrict: 'E',
          transclude: true,
          scope: {
              position: '=',
          },
          templateUrl: 'partials/ruler.html',
          controller: function($scope, $element, $compile) {
              var div = $element.find('.ruler-ticks');

              $scope.$watch('position', function(pos) {

                  // TODO this needs to match the (visual) scale of the highlighted
                  //      overview area
                  var a = pos.start - 5000;
                  var b = pos.end + 5000;

                  // TODO this needs to respond to the width of the visible area
                  //      e.g. if the visible area is 50, then 1000 bp chunks is way
                  //           too big, and if it's 1000000, then 1000 is too small.
                  var chunk = 1000;

                  var bottom = Math.ceil(a / 1000) * 1000;
                  var top = Math.floor(b / 1000) * 1000;

                  div.html('');

                  var c = ((top - bottom) / 1000) + 1
                  for (var i = 0; i < c; i++) {

                      // TODO do this with ng-repeat
                      var j = (i * 1000) + bottom;
                      var html = "<span class='ruler-tick'>" + j + "</span>";
                      var e = angular.element(html);

                      var p = ((j - a) / (b - a)) * 100;
                      e.css('left', p + '%');

                      div.append(e);
                  }

              }, true);
          },
      };
  });
