
const socket = io('wss://integracion-tarea-3.herokuapp.com', {
  path: '/flights'
});
var colors = ['#FF6633', '#FFB399', '#FF33FF', '#FFFF99', '#00B3E6',
		  '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D',
		  '#80B300', '#809900', '#E6B3B3', '#6680B3', '#66991A',
		  '#FF99E6', '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC',
		  '#66994D', '#B366CC', '#4D8000', '#B33300', '#CC80CC',
		  '#66664D', '#991AFF', '#E666FF', '#4DB3FF', '#1AB399',
		  '#E666B3', '#33991A', '#CC9999', '#B3B31A', '#00E680',
		  '#4D8066', '#809980', '#E6FF80', '#1AFF33', '#999933',
		  '#FF3380', '#CCCC00', '#66E64D', '#4D80CC', '#9900B3',
		  '#E64D66', '#4DB380', '#FF4D4D', '#99E6E6', '#6666FF'];
var flights = [];
var map;
var markers = [];
var airports = [];

function initMap() {

  socket.emit('AIRPORTS',{'a':''});

  socket.on('AIRPORTS',function(data){
    // creo airports
    for (var key in data){
      airports.push({lat:data[key]['airport_position'][0] , lng:data[key]['airport_position'][1] , name:data[key]['name'], airport_code:data[key]['airport_code'],city:data[key]['city'],country:data[key]['country'],country_code:data[key]['country_code']})
    }
    // creo mapa
    map = new google.maps.Map(document.getElementById('map'), {
      zoom: 5,
      center: {lat: airports[0]['lat'], lng: airports[0]['lng']}
    });
    // creo marcadores de aeropuertos
    airports.forEach(function(element) {
      var marker = new mapIcons.Marker({
        position: {lat: element['lat'] , lng: element['lng']},
        icon: {
          path: mapIcons.shapes.MAP_PIN,
          fillColor: '#106d66',
          fillOpacity: 1,
          strokeColor: '',
          strokeWeight: 0
        },
        map: map,
        map_icon_label: '<span class="map-icon map-icon-airport"></span>'
      });
      // creo el contenido de la infoWindow de cada aeropuerto
      var airportString = '<div id="content">'+
      '<h2>Aeropuerto: '+ element['name'] + '</h2>'+
      '<h4>('+ element['airport_code'] + ' - ' + element['country_code'] + ')</h4>'+
      '<h4>País: '+ element['country'] + '</h4>'+
      '<h4>Ciudad: '+ element['city'] + '</h4>'+
      '<h4>Código de País: '+ element['country_code'] + '</h4>'+
      '</div>';
      // creo la infoWindow por aeropuerto
      var airportwindow = new google.maps.InfoWindow({
        content: airportString
      });
      // me suscribo al hover
      marker.addListener('mouseover', function() {
        airportwindow.open(map, marker);
      });
      // me suscribo al mouseout para que desaparezca
      marker.addListener('mouseout', function() {
        airportwindow.close();
      });
    });
    // luego de trabajar sobre cada aeropuerto, trabajo sobre los flights
    socket.emit('FLIGHTS',{'a':''});

    socket.on('FLIGHTS',function(data){
      // por cada vuelo, obtengo y extraigo su información
      for (var key in data){
        flights.push({
          airline:data[key]['airline'],
          code:data[key]['code'],
          destination:data[key]['destination']['name'],
          destinationLat:data[key]['destination']['airport_position'][0],
          destinationLng:data[key]['destination']['airport_position'][1],
          origin:data[key]['origin']['name'],
          originLat:data[key]['origin']['airport_position'][0],
          originLng:data[key]['origin']['airport_position'][1],
          seats:data[key]['seats'],
          plane:data[key]['plane']})
      }
      // dibujo la linea recta entre origen y destino
      flights.forEach(function(element) {
        var line = new google.maps.Polyline({
            path: [
                new google.maps.LatLng(element['destinationLat'], element['destinationLng']),
                new google.maps.LatLng(element['originLat'], element['originLng'])
            ],
            strokeColor: "#1F60E8",
            strokeOpacity: 0.5,
            strokeWeight: 5,
            map: map
        });
      });
    });
  });
  // finalmente, capturo constantemente recepciones de "position" de cada vuelo
  socket.on('POSITION', function(data){
    // defino el símbolo a utilizar de marcador
    var plane = {
      path: 'M510,255c0-20.4-17.85-38.25-38.25-38.25H331.5L204,12.75h-51l63.75,204H76.5l-38.25-51H0L25.5,255L0,344.25h38.25l38.25-51h140.25l-63.75,204h51l127.5-204h140.25C492.15,293.25,510,275.4,510,255z',
      fillColor: 'gray',
      fillOpacity: 0.8,
      scale: 0.07,
      strokeColor: 'black',
      strokeWeight: 0.5,
      origin: new google.maps.Point(0,0),
      anchor: new google.maps.Point(0,240)
    };
    // guardo posicion enviada
    var myLatLng = {lat: data['position'][0], lng: data['position'][1]};
    var lastPosn = null;
    var notHere = true;
    // identifico el marcador al que corresponde
    // si estaba, lo actualizo en su posicion
    for (var i = 0; i < markers.length; i++) {
      if(markers[i]!= null && markers[i]['code']==data['code']){
        var path_1 = markers[i]['marker'].getPosition();
        lastPosn = {lat:markers[i]['lat'],lng:markers[i]['lng']};
        markers[i]['marker'].setPosition(myLatLng);
        var path_2 = markers[i]['marker'].getPosition();
        notHere = false;
        var temp = markers[i]['marker'].getPosition();
        var heading = google.maps.geometry.spherical.computeHeading(path_1, path_2);
        var auxIcon = plane;
        auxIcon.rotation=heading-90;
        // auxIcon.strokeColor = markers[i]['color'];
        markers[i]['marker'].setIcon(auxIcon);
        var line = new google.maps.Polyline({
            path: [
                new google.maps.LatLng(lastPosn['lat'], lastPosn['lng']),
                new google.maps.LatLng(myLatLng['lat'], myLatLng['lng']),
            ],
            strokeColor: markers[i]['color'],
            strokeOpacity: 1,
            strokeWeight: 15,
            map: map
        });
      }
    }
    if(notHere){
      // si no estaba, lo creo, aunque aún no lo mostraré
      var marker = new google.maps.Marker({
        position: myLatLng,
        map: map,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 0,
        },
      });

      var flight;
      for(var i=0;i<flights.length;i++){
        if(flights[i]['code']==data['code']){
          flight = flights[i];
          break;
        }
      }
      // luego identifico el vuelo al que corresponde y creo una
      // information Window
      var contentString = '<div id="content">'+
      '<h1>NºVuelo:'+ flight['code'] + '</h1>'+
      '<h4>Aerolínea: '+ flight['airline'] + '</h4>'+
      '<h4>Origen: '+ flight['origin'] + '</h4>'+
      '<h4>Destino: '+ flight['destination'] + '</h4>'+
      '<h4>Avión: '+ flight['plane'] + '</h4>'+
      '<h4>Cantidad Asientos: '+ flight['seats'] + '</h4>'+
      '</div>';

      var infowindow = new google.maps.InfoWindow({
        content: contentString
      });
      marker.addListener('mouseover', function() {
        infowindow.open(map, marker);
      });
      marker.addListener('mouseout', function() {
        infowindow.close();
      });
      var color = colors[Math.floor(Math.random()*colors.length)];
      markers.push({color:color,marker:marker,code:data['code'],lat:myLatLng['lat'],lng:myLatLng['lng']});
    }
  });
}
