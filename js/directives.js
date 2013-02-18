angular.module('ChetDirectives', []).


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
      templateUrl: 'templates/track.html',
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
      templateUrl: 'templates/overview.html',
      scope: {
        position: '=',
      },
      controller: function($scope, $element, $document) {

          var dragType = '';
          var dragging = false;
          var pos = 0;

          // TODO shifted position needs to be relative to the scale of the viewer
          //      e.g. 1 px on a 1 to 1 million scale is a bigger jump than
          //           1 px on a 1 to 1000 scale.
          $scope.startPanDrag = function(e) {
            dragging = true;
            pos = e.clientX;
            dragType = 'pan';
          }

          $scope.startZoomLeftDrag = function(e) {
            dragging = true;
            pos = e.clientX;
            dragType = 'zoom-left';
          }

          $scope.startZoomRightDrag = function(e) {
            dragging = true;
            pos = e.clientX;
            dragType = 'zoom-right';
          }

          // TODO I wonder how inefficient this is...
          //      how efficient is refreshing every time this event is fired?
          //      should refresh be on an interval loop?
          $document.bind('mousemove', function(e) {
              if (dragging) {
                // Use $apply to execute this DOM event within Angular's digest cycle.
                $scope.$apply(function(s) {
                    var p = (pos - e.clientX) / $element.width();
                    var d = s.position.max * p;

                    switch (dragType) {
                      case 'pan':
                        s.position.shift(d * -1);
                        break;

                      case 'zoom-left':
                        s.position.start -= d;
                        break;
                        
                      case 'zoom-right':
                        s.position.end -= d;
                        break;
                    }
                });
                pos = e.clientX;
              }
          });

          $document.bind('mouseup', function(e) {
              dragging = false;
          });
      },
      link: function(scope, elem, attrs, controller) {
        scope.$watch('position', function(position) {

            var start = position.start / position.max * 100;
            var end = position.end / position.max * 100;
            elem.find('.overview-visible').css('left', start + '%');
            elem.find('.overview-visible').width(end - start + '%');

        }, true);
      },
    };
  }).


  directive('chetGeneTrack', function() {
    return {
      restrict: 'E',
      templateUrl: 'templates/gene_track.html',
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
            var genes = Genes.query({db: $scope.server}, function() {
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
      templateUrl: 'templates/coverage_track.html',
      scope: {
        position: '=',
        server: '@',
        name: '@',
      },
      controller: function($scope, Coverage) {

          $scope.points = [];
          // TODO should be watching server too
          $scope.$watch('position', function(position) {

              var res = Coverage.get({db: $scope.server}, function() {

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
        points: '=',
      },
      link: function(scope, elem, attrs, ctrl) {

          var canvas = elem[0];
          canvas.width = canvas.clientWidth;
          canvas.height = canvas.clientHeight;
          var ctx = canvas.getContext('2d');

          scope.$watch('points', function(pts) {

              // TODO dynamic canvas dimensions
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              if (pts.length > 0) {
                  ctx.beginPath();

                  ctx.moveTo(pts[0].x, canvas.height);

                  angular.forEach(pts, function(pt) {
                      // TODO normalize pt to height/scale of canvas
                      ctx.lineTo(pt.x, pt.y);
                  });

                  ctx.lineTo(canvas.width, canvas.height);
                  ctx.lineTo(0, canvas.height);
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
      templateUrl: 'templates/zoomer.html',
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
      templateUrl: 'templates/position_drag.html',
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
