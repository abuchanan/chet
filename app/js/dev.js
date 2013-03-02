angular.module('chet.dev', ['chet', 'ngMockE2E']).
  run(function($httpBackend) {

    $httpBackend.whenGET(/coverage\/serverC/).respond(function(method, url, data) {
        var p = parseUri(url).queryKey;
        var start = parseInt(p.start);
        var end = parseInt(p.end);
        var x = serverC.getCoverageForInterval({ref: p.ref, start: start, end: end});
        return [200, angular.toJson(x), {}];
    });

    $httpBackend.whenGET(/genes\/serverA\/data/).respond(function(method, url, data) {
        var p = parseUri(url).queryKey;
        var start = parseInt(p.start);
        var end = parseInt(p.end);
        var x = serverA.getGenesInInterval({ref: p.ref, start: start, end: end});
        return [200, angular.toJson(x), {}];
    });

    $httpBackend.whenGET('genes/serverA/sizes').respond(tair10.A.sizes);
    $httpBackend.whenGET('genes/serverB/sizes').respond(tair10.B.sizes);

    $httpBackend.whenGET(/genes\/serverB\/data/).respond(function(method, url, data) {
        var p = parseUri(url).queryKey;
        var start = parseInt(p.start);
        var end = parseInt(p.end);
        var x = serverB.getGenesInInterval({ref: p.ref, start: start, end: end});
        return [200, angular.toJson(x), {}];
    });

    var tracks = [
      {template: 'partials/gene_track.html', server: 'serverA', name: 'Genes A', show: true},
      {template: 'partials/gene_track.html', server: 'serverB', name: 'Genes B', show: true},
      {template: 'partials/coverage_track.html', server: 'serverC', name: 'Coverage C', show: true},
    ];

    $httpBackend.whenGET('instance/1').respond({
        tracks: tracks,
    });

    $httpBackend.whenGET('instance/2').respond({
        tracks: [tracks[1]],
    });

    $httpBackend.whenGET('instance').respond([
      {name: 'Dummy Instance 1', ID: 1},
      {name: 'Dummy Instance 2', ID: 2},
    ]);

    $httpBackend.whenGET('presets').respond(tracks);

    $httpBackend.whenGET(/^partials\//).passThrough();

  });



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
};


var serverA = new DummyGeneServer(tair10.A.genes);

var serverB = new DummyGeneServer(tair10.B.genes);

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
        var start = Math.max(Math.floor(position.start / interval), 0);
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
