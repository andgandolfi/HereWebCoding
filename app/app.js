angular.module('myApp', ['here', 'ui.sortable', 'ngSanitize'])
    .constant('myHereSettings', {
        app_id: 'DemoAppId01082013GAL',
        app_code: 'AJKnXv84fjrb0KIHawS0Tg',
        accept: 'application/json',
        at: '0,0'  // TODO: add HTML5 location API
    })
    .controller('main', ['$scope', '$sanitize', 'OneBoxSearch', 'myHereSettings', 'Itinerary',
        function ($scope, $sanitize, OneBoxSearch, myHereSettings, Itinerary) {
            // TODO: accept routing to itinerary
            var self = this;
            self.settings = myHereSettings;
            self.searchText = '';
            self.modeOfTransport = 'car';

            self.resultList = [];

            self.sortableOptions = {
                axis: 'y',
                handle: '.sort-handle'
            };

            self.myItinerary = new Itinerary(myHereSettings);

            var oneBoxSearch = new OneBoxSearch(myHereSettings);

            self.searched = false;
            self.search = function (text) {
                oneBoxSearch.search(text)
                    .then(function (list) {
                        self.resultList = list;
                        self.searched = true;
                    }, function (err) {
                        console.log(err);
                        self.searched = true;
                    });
                self.searchText = '';
            };
        }]);