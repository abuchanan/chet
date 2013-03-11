'use strict';

/*
function ChetPosition(ref, start, end) {
  this.ref = ref;
  this.start = start;
  this.end = end;
  // TODO this is an arbitrary
  this.max = 800000;
}
ChetPosition.prototype = {
    get width() {
    },
    maxHint: function(max) {
    },
    shift: function(amount) {
    },
    shiftTo: function(start) {
    }
};
*/

describe('ChetPosition', function(){
  var pos;

  beforeEach(function(){
    pos = new ChetPosition('ref1', 25, 150, 300);
  });

  it('should have a "ref" attribute', function() {
    expect(pos.ref).toEqual('ref1');
  });

  it('should have a "max" attribute', function() {
    expect(pos.max).toEqual(300);
  });

  it('should have "start" and "end" accessors', function() {
    expect(pos.start()).toEqual(25);
    pos.start(34);
    expect(pos.start()).toEqual(34);

    expect(pos.end()).toEqual(150);
    pos.end(200);
    expect(pos.end()).toEqual(200);
  });

  it('should have a width (interval is half-open)', function() {
    expect(pos.width()).toEqual(125);
  });

  it('should raise an exception when setting end less than start', function() {
    expect(function() {
      pos.end(24);
    }).toThrow();
  });

  it('should raise an exception when setting start greater than end', function() {
    expect(function() {
      pos.start(151);
    }).toThrow();
  });

  it('should raise an exception when setting start equal to end', function() {
    expect(function() {
      pos.start(150);
    }).toThrow();
  });

  it('should raise an exception when setting end equal to start', function() {
    expect(function() {
      pos.end(25);
    }).toThrow();
  });

  it('should have a shift(amount) method ' +
     'that shifts the interval by the given amount', function() {

    pos.shift(25);
    expect(pos.start()).toEqual(50);
    expect(pos.end()).toEqual(175);
  });

  it('should accept negative values to shift(amount)', function() {
    pos.shift(-10);
    expect(pos.start()).toEqual(15);
    expect(pos.end()).toEqual(140);
  });

  it('should have a shiftTo(position) method ' +
     'that shifts the start to the given position', function() {

    pos.shiftTo(100);
    expect(pos.start()).toEqual(100);
    expect(pos.end()).toEqual(225);
  });

});
