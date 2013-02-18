angular.module('ChetDev', ['Chet', 'ngMockE2E']).
  run(function($httpBackend) {

    var x = serverC.getCoverageForInterval({start: 10, end: 700});
    $httpBackend.whenGET('coverage/serverC').respond(x);

    var x = serverA.getGenesInInterval({ref: 'ref1', start: 10, end: 700});
    $httpBackend.whenGET('genes/serverA').respond(x);

    var x = serverB.getGenesInInterval({ref: 'ref1', start: 10, end: 700});
    $httpBackend.whenGET('genes/serverB').respond(x);

    $httpBackend.whenGET('instance/1').respond({
        tracks: [
          {type: 'chet-gene-track', server: 'serverA', name: 'Genes A'},
          {type: 'chet-gene-track', server: 'serverB', name: 'Genes B'},
          {type: 'chet-coverage-track', server: 'serverC', name: 'Coverage C'},
        ],
    });

    $httpBackend.whenGET('instance/2').respond({
        tracks: [
          {type: 'chet-gene-track', server: 'serverB', name: 'Blah Genes'},
        ],
    });

    $httpBackend.whenGET('instance').respond([
      {name: 'Dummy Instance 1', ID: 1},
      {name: 'Dummy Instance 2', ID: 2},
    ]);

    $httpBackend.whenGET('presets').respond([
      {type: 'chet-gene-track', server: 'serverA', name: 'Genes A'},
      {type: 'chet-gene-track', server: 'serverB', name: 'Genes B'},
      {type: 'chet-coverage-track', server: 'serverC', name: 'Coverage C'},
    ]);

    $httpBackend.whenGET(/^templates\//).passThrough();

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
