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

          // TODO would be nice if overview had more graceful handling of 
          //      positions near zero.  instead of showing large negative numbers,
          //      it could shift the highlighted area to the left.

          // TODO animate change of position


          // TODO note that this scale is defined here, as well as separately
          //      in the css background gradient.
          //      would be nice to tie them together
          var scale = .25;
          var scale_edge = (1 - scale) / 2;

          var op = new ChetPosition;
          $scope.overview_position = op;

          var p = $scope.position;

          var b = p.start;


          function update_overview() {
              var x = (p.width / scale) * scale_edge;
              op.start = p.start - x;;
              op.end = p.end + x;
          }


          function update_box() {

              var x = (b - op.start) / op.width;

              $scope.overview_box_style = {
                width: (scale * 100) + '%',
                left: (x * 100) + '%',
              };
          }


          $scope.$watch('position', function() {

              op.ref = p.ref;
              op.max = p.max;
              b = p.start;

              update_overview();
              update_box();

          }, true);


          var dragging = false;
          var panning = false;

          // TODO increase pan_amount with time mouse is held down
          var pan_delay = 50;

          var pos = 0;

          function watchEdges() {
              var y = 0;
              if (b < op.start) {
                  y = -1;
              } else if (b + p.width > op.end) {
                  y = 1;
              }

              if (y) {
                  var z = op.width * .005 * y;
                  op.shift(z);
                  b += z;
                  update_box();
              }
              panning = $timeout(watchEdges, pan_delay);
          }

          // TODO shifted position needs to be relative to the scale of the viewer
          //      e.g. 1 px on a 1 to 1 million scale is a bigger jump than
          //           1 px on a 1 to 1000 scale.
          $scope.startPanDrag = function(e) {
            dragging = true;
            pos = e.clientX;
            panning = $timeout(watchEdges, pan_delay);
          }

          var el = $element.find('.overview')

          // TODO I wonder how inefficient this is...
          //      how efficient is refreshing every time this event is fired?
          //      should refresh be on an interval loop?
          $document.bind('mousemove', function(e) {

              if (dragging) {

                var p = (e.clientX - pos) / el.width();
                b += p * op.width;

                $scope.$apply(function() {
                    update_box();
                });

                pos = e.clientX;
              }
          });

          $document.bind('mouseup', function(e) {

              dragging = false;
              $timeout.cancel(panning);

              $scope.$apply(function(s) {
                 
                  p.shiftTo(b);
                  update_box();
              });
          });
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

        controller: function($scope, $element, $document) {

            var percent = 15;

            // TODO bar isn't clickable

            // TODO slider scale is currently linear,
            //      but should be logaritmic (exponential?)
            var filled_color = 'rgba(255, 0, 0, 1)';
            var empty_color = 'rgba(255, 255, 255, 1)';

            function build_style() {
                var s = 'linear-gradient(to right, ' + 
                        filled_color + ' 0%, ' + 
                        filled_color + ' ' + percent + '%, ' + 
                        empty_color + ' ' + percent + '%, ' +
                        empty_color + ' 100%)';

                $scope.bar_style = {
                  background: s,
                };

                var w = handle.width() / 2 / $element.width() * 100;
                var z = percent - w;

                $scope.handle_style = {
                  left: z + '%',
                }

                /*
                TODO 
                var pos = $scope.position;
                var mid = pos.start + (pos.width / 2);
                var v = pos.max * (percent / 100) / 2;
                pos.start -= v;
                pos.end += v;
                */
            }

            var handle = $element.find('.chet-zoomer-handle');

            build_style();

            var dragging = false;

            $scope.startDrag = function(e) {
              dragging = true;
            }

            $document.bind('mousemove', function(e) {

                if (dragging) {

                    // Use $apply to execute this DOM event within Angular's digest cycle.
                    $scope.$apply(function() {

                        percent = (e.clientX - $element.offset().left) / $element.width() * 100;
                        if (percent < 0) {
                            percent = 0;
                        } else if (percent > 100) {
                            percent = 100;
                        }

                        build_style();
                    });
                }
            });

            $document.bind('mouseup', function(e) {
                dragging = false;
            });

            $scope.zoomOut = function() {
              // TODO zoom function on position?
              $scope.position.start -= 10;
              $scope.position.end += 10;
            }

            $scope.zoomIn = function() {
              // TODO zoom function on position?
              $scope.position.start += 10;
              $scope.position.end -= 10;
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

  // TODO this could ditch the template and just act on the element which it's attached to
  directive('chetScrollPosition', function() {
    return {
      // TODO this one might be useful as an attribute
      restrict: 'E',
      transclude: true,
      scope: {
        position: '=',
      },
      templateUrl: 'partials/scroll_position.html',
      controller: function($scope, $element, $timeout) {

        // TODO this prevents scrolling below zero, but there are cases
        //      when you might want to scroll a bit past zero,
        //      e.g. to get a certain gene in the middle of the screen

        // TODO initialize scroll position with track position
        //      watch scope.position for change


        // TODO up/down scrolling broken...fffuuuuuu
        ///     ... sort of.  if the mouse moves, the focus changes or something,
        //      and then it works again.

        var pos = $scope.position;

        var scroll_pane = $element.find('.scroll-pane');
        var stickies = $element.find('.scroll-pane-sticky');

        // This is helping prevent the scroll position from being set multiple
        // times.  For example, if the user scrolls, the scroll event is caught
        // below, and the position is updated, but we also watch for changes 
        // to position and react by setting the scroll position.  This cycle
        // seems to affect the user experience of scrolling.
        // TODO: look for a more elegant way to solve this.  For now this works.
        var scrolled = false;

        $scope.$watch('position', function(newVal, oldVal) {

            if (!scrolled) {
                var p = (pos.start / pos.max) * scroll_pane[0].scrollWidth;
                scroll_pane.scrollLeft(p);
            }
            //console.log(scroll_pane.scrollLeft());
            //console.log((pos.start / pos.max) * scroll_pane[0].scrollWidth);
        }, true);



        function sc() {
          scroll_pane.scrollLeft(scroll_pane.scrollLeft() + 50);
          $timeout(sc, 50);
        };

        scroll_pane.scroll(function(e) {

            var t = e.target;
            stickies.css('left', t.scrollLeft + 'px');

            scrolled = true;
            $scope.$apply(function(s) {
                pos.shiftTo(t.scrollLeft / t.scrollWidth * pos.max);
            });
            scrolled = false;
        });

      },
    }
  }).

  directive('chetRuler', function() {
      return {
          restrict: 'E',
          transclude: true,
          scope: {
              position: '=',
          },
          templateUrl: 'partials/ruler.html',
          controller: function($scope, $compile) {
              $scope.ticks = [];

              $scope.$watch('position', function(pos) {

                  // TODO document this somewhere.
                  var z = [1, 2.5, 5, 10];
                  var order = Math.floor(Math.log(pos.width) / Math.log(10));

                  var best = null;
                  var last = null;

                  for (var i = 0; i < z.length; i++) {
                      var d = z[i] * Math.pow(10, order - 1);
                      var x = pos.width / d;
                      var a = Math.abs(10 - x);

                      if (!best) {
                          best = d;
                          last = a;
                      } else if (a < last) {
                          best = d;
                          last = a;
                      }
                  }

                  var x = pos.width / 10;
                  var chunk = best;

                  var bottom = Math.ceil(pos.start / chunk) * chunk;
                  var top = Math.floor(pos.end / chunk) * chunk;

                  var c = ((top - bottom) / chunk) + 1
                  var ticks = [];
                  for (var i = 0; i < c; i++) {

                      // TODO do this with ng-repeat
                      var j = (i * chunk) + bottom;

                      var p = ((j - pos.start) / pos.width) * 100;

                      var tick = {
                        label: j,
                        style: {
                          left: p + '%',
                        },
                      };
                      ticks.push(tick);

                  }
                  $scope.ticks = ticks;

              }, true);
          },
      };
  });
