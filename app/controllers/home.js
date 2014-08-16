(function(){
    var app = angular.module("app");
    app.controller('HomeCtrl', ['$scope', '$timeout', 'websocketService', function($scope, $timeout, websocketService) {


        var rtc = new websocketService.RTC();
        console.log(rtc);
        rtc.start('abcdefgh');
    }]);
}());

