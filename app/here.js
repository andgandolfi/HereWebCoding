angular.module('here', [])
    .factory('OneBoxSearch', ['$http', '$q', function ($http, $q) {
        function encodeSettings(settings) {
            var result = [];
            Object.keys(settings).forEach(function (key) {
                result.push(key + '=' + encodeURIComponent(settings[key]));
            });
            return result.join('&');
        }

        function OneBoxSearch(settings) {
            this.settings = settings;
        }
        OneBoxSearch.prototype.search = function (text) {
            return $http
                .get('//places.demo.api.here.com/places/v1/discover/search?' +
                encodeSettings(angular.extend({}, this.settings, {q: text})))
                .then(function (res) {
                    return res.data.results.items;
                }, function (err) {
                    return $q.reject(err);
                });
        };

        return OneBoxSearch;
    }])
    .factory('')
    .factory('Itinerary', [function () {
        function Itinerary(settings) {
            this.settings = settings;
            this.waypoints = [];
        }
        Itinerary.prototype.add = function (item) {
            var alreadyInList = _.find(this.waypoints, function (i) {
                return i.id === item.id;
            });

            if (!alreadyInList)
                this.waypoints.push(item);
        };
        Itinerary.prototype.remove = function (item) {
            this.waypoints.splice(this.waypoints.indexOf(item), 1);
        };

        // TODO: add method to store an itinerary in memory

        return Itinerary;
    }])
    .factory('HereMap', ['$http', '$q', function ($http, $q) {
        function HereMap(settings, element){
            this.settings = settings;
            this.element = element;
            this.platform = new H.service.Platform({
                app_id: settings.app_id,
                app_code: settings.app_code,
                useCIT: true
            });
            this.defaultLayers = this.platform.createDefaultLayers();
            this.map = new H.Map(this.element, this.defaultLayers.normal.map);
            this.behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(this.map));
            this.ui = H.ui.UI.createDefault(this.map, this.defaultLayers);

            this.bubble = undefined;
        }
        HereMap.prototype.openBubble = function(position, text) {
            if(!this.bubble){
                this.bubble =  new H.ui.InfoBubble(
                    position,
                    {content: text});
                this.ui.addBubble(this.bubble);
            } else {
                this.bubble.setPosition(position);
                this.bubble.setContent(text);
                this.bubble.open();
            }
        };
        HereMap.prototype.addRouteShapeToMap = function (route) {
            var strip = new H.geo.Strip(),
                routeShape = route.shape;

            routeShape.forEach(function(point) {
                var parts = point.split(',');
                strip.pushLatLngAlt(parts[0], parts[1]);
            });

            var polyline = new H.map.Polyline(strip, {
                style: {
                    lineWidth: 4,
                    strokeColor: 'rgba(0, 128, 255, 0.7)'
                }
            });

            this.map.addObject(polyline);

            this.map.setViewBounds(polyline.getBounds(), true);
        };
        HereMap.prototype.addManueversToMap = function (route) {
            var svgMarkup = '<svg width="18" height="18" ' +
                    'xmlns="http://www.w3.org/2000/svg">' +
                    '<circle cx="8" cy="8" r="8" ' +
                    'fill="#1b468d" stroke="white" stroke-width="1"  />' +
                    '</svg>',
                dotIcon = new H.map.Icon(svgMarkup, {anchor: {x:8, y:8}}),
                group = new  H.map.Group(),
                i,
                j;

            for (i = 0;  i < route.leg.length; i += 1) {
                for (j = 0;  j < route.leg[i].maneuver.length; j += 1) {
                    var maneuver = route.leg[i].maneuver[j];
                    var marker =  new H.map.Marker({
                            lat: maneuver.position.latitude,
                            lng: maneuver.position.longitude} ,
                        {icon: dotIcon});
                    marker.instruction = maneuver.instruction;
                    group.addObject(marker);
                }
            }

            group.addEventListener('tap', function (evt) {
                this.map.setCenter(evt.target.getPosition());
                this.openBubble(evt.target.getPosition(), evt.target.instruction);
            }.bind(this), false);

            this.map.addObject(group);
        };
        HereMap.prototype.calculateRouteFromAtoB = function (waypoints, mode) {
            var router = this.platform.getRoutingService(),
                routeRequestParams = {
                    mode: mode,
                    representation: 'display'
                };

            var coordinates = Array.prototype.map.call(waypoints, function (point) {
                return point.position[0] + ',' + point.position[1];
            });

            if (coordinates && coordinates.length === 1) {
                var coo = coordinates[0].split(',');
                this.map.setCenter({lat: +coo[0], lng: +coo[1]});
                this.map.setZoom(12);
            }

            coordinates.forEach(function (val, index) {
                routeRequestParams['waypoint' + index] = val;
            });

            router.calculateRoute(
                routeRequestParams,
                this.onRouteCalculationSuccess.bind(this),
                console.log
            );
        };
        HereMap.prototype.onRouteCalculationSuccess = function (result) {
            console.log(result);

            if (!result || !result.response || !result.response.route)
                return;

            var route = result.response.route[0];

            this.map.getObjects().forEach(function (obj) {
                try {
                    this.map.removeObject(obj);
                } catch(exc) {}
            }.bind(this));

            this.addRouteShapeToMap(route);
            this.addManueversToMap(route);
        };

        return HereMap;
    }])
    .factory('RouteCalculator', ['$http', '$q', function ($http, $q) {
        function RouteCalculator(settings, itinerary) {
        }

        return RouteCalculator;
    }])
    .directive('hereMap', ['HereMap', function (HereMap) {
        return {
            restrict: 'A',
            scope: {
                settings: '=',
                itinerary: '=',
                modeOfTransport: '='
            },
            link: function (scope, elem, attrs) {
                var hereMap = new HereMap(scope.settings, elem[0]);

                hereMap.map.setCenter({lat:0, lng:0});  // TODO: as scope params?
                hereMap.map.setZoom(2);

                var modeOfTransportPrefix = 'fastest;';

                scope.$watch('itinerary.waypoints', function (path) {
                    hereMap.calculateRouteFromAtoB(path, modeOfTransportPrefix + scope.modeOfTransport);
                }, true);

                scope.$watch('modeOfTransport', function (mode) {
                    hereMap.calculateRouteFromAtoB(scope.itinerary.waypoints, modeOfTransportPrefix + mode);
                });
            }
        }
    }]);
