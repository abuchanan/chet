angular.module('chet.filters', []).
    filter('abbreviateNumber', function() {
        return function(input) {

            // TODO this is probably incorrect and could use lots of improvement
            var i = parseInt(input);
            var order = Math.floor(Math.log(i) / Math.log(10));
            var m = Math.floor(order / 3) * 3;
            var l = i / Math.pow(10, m);

            if (order >= 3 && order <= 5) {
                return l + 'k';

            } else if (order >= 6 && order <= 8) {
                return l + 'm';

            } else if (order >= 9 && order <= 12) {
                return l + 'b';

            } else {
                return input;
            }
        }
    });
