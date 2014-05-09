var currentLocation = {
    // default location @pangyo, Korea
    "latitude": 37.397777999999995,
    "longitude": 127.1098276
};

PlanetX.init({
    appkey : "b69433e6-a2c9-33a1-a2b9-2555fbd5fedd" ,
    client_id : "b3d195a3-ec2d-37f7-9b7b-1fc60ee43b79",
    redirect_uri : "http://localhost:8013/",           
    scope : "tcloud",
    savingToken : true
});




TmapDemo = {
    map:null,
    // tmap initialize
    init:function(){
	var pr_4326 = new Tmap.Projection("EPSG:4326");
	var pr_3857 = new Tmap.Projection("EPSG:3857");

	// 위경도(WGS84GEO)를 googlel Mercator로
	this.currentLonLat = (new Tmap.LonLat(currentLocation.longitude, currentLocation.latitude)).transform(pr_4326,pr_3857);
	this.map = new Tmap.Map({div:"map", width:"100%", height:"300px"});
	this.map.setCenter(this.currentLonLat, 16);

	this.vectorLayer = new Tmap.Layer.Vector("Walking Path");
	this.map.addLayer(this.vectorLayer);

	this.markers = new Tmap.Layer.Markers("Around Markers");
	this.map.addLayer(this.markers);


	var size = new Tmap.Size(32,32);
	var offset = new Tmap.Pixel(-(size.w/2), -size.h);
	var blueIcon = new Tmap.Icon("img/blue_marker.png", size, offset);  
	this.redIcon = new Tmap.Icon("img/red_marker.png", size, offset);

	var marker = new Tmap.Marker(this.currentLonLat, blueIcon);
	this.markers.addMarker(marker);


	$("a[href=#tmap]").on("shown.bs.tab",function(){
	    TmapDemo.map.updateSize();
	});

	$("#poi").click(TmapDemo.around);
	
	this.map.layers[1].events.register("click",null,this.findAddress);

    },

    // POI 주변검색
    aroundSuccess:function(json){
	for(var i=0; i<json.searchPoiInfo.count; i++){
	    var poi = json.searchPoiInfo.pois.poi[i];
	    var lon = poi.frontLon || poi.noorLon;
	    var lat = poi.frontLat || poi.noorLat;
	    var marker = new Tmap.Marker( new Tmap.LonLat(lon, lat), TmapDemo.redIcon );

	    TmapDemo.markers.addMarker(marker);
	    marker.events.register("click",marker,TmapDemo.findWalkingPath);
	}
    },
    around:function(){
	PlanetX.api("get", "https://apis.skplanetx.com/tmap/pois/search/around", "JSON", 
	    {
		"version" : 1,
		"categories" : "편의점",
		"centerLon" : currentLocation.longitude,
		"centerLat" : currentLocation.latitude,
		"reqCoordType" : "WGS84GEO",
	    }, 
	    TmapDemo.aroundSuccess);
    },

    // 보행자 길찾기
    walkingPath:function(start, end){
	var vector_format = new Tmap.Format.GeoJSON({}); 
	
	prtcl = new Tmap.Protocol.HTTP({
            url: "https://apis.skplanetx.com/tmap/routes/pedestrian",
	    readWithPOST:true,
            format: vector_format,
	    headers:{appkey: "b69433e6-a2c9-33a1-a2b9-2555fbd5fedd"},
	    params:{
		"version": 1,
		"startX": start.lon,
		"startY": start.lat,
		"endX": end.lon,
		"endY": end.lat,
		"startName": "출발",
		"endName": "도착"
	    }
	});
	prtcl.read({callback:function(response){
	    TmapDemo.vectorLayer.addFeatures(response.features);
	}});
    },
    findWalkingPath:function(e){
	// "this" means the marker binded by event register
	TmapDemo.walkingPath(TmapDemo.currentLonLat, this.lonlat);
    },


    // 주소검색
    findAddress:function(e){
	var lonlat = TmapDemo.map.getLonLatFromPixel(new Tmap.Pixel(e.layerX,e.layerY));
	TmapDemo.reverseGeocoding(lonlat);
    },
    reverseGeocoding:function(lonlat){
	PlanetX.api("get", "https://apis.skplanetx.com/tmap/geo/reversegeocoding", "JSON", 
	    {
		"version" : 1,
		"lon" : lonlat.lon,
		"lat" : lonlat.lat
	    },
	    function(json){
		$("#address").tooltip("show");
		$(".tooltip-inner").text(json.addressInfo.fullAddress).css({"max-width":"none"});
	    }
	);
    }
};



TcloudDemo = {
    init:function(){
	$("#login").click(this.login);
	$("#logout").click(this.logout);
	$("#upload").click(this.uploadFile);

	this.onStatusChange();
    },
    onStatusChange:function(){
	if(PlanetX.getLoginStatus()){
	    $("#login").hide();
	    $("#logout").show();
	    TcloudDemo.thumbnails();
	}else{
	    $("#logout").hide();
	    $("#login").show();
	    $("#thumbnails").empty();
	}
    },
    login:function(){
	PlanetX.login();
    },
    logout:function(){
	PlanetX.logout(TcloudDemo.onStatusChange);
    },
    thumbnails:function(){
	PlanetX.api("get", "https://apis.skplanetx.com/tcloud/images", "JSON", 
	    {
		"version" : 1,
		"page" : 1,
		"count" : 24
	    },
	    TcloudDemo.listingFiles);
    },
    listingFiles:function(json){
	var images = json.meta.images.image;
	$("#thumbnails").empty();

	for(var i=0; i<images.length; i++){
	    var img = images[i];
	    $("#thumbnails").append(
		$("<a>",{"href":img.downloadUrl}).append(
		    $("<img>", { 
			"src":img.thumbnailUrl,
			"class":"col-md-2"
		    })
		)
	    );
	}
    },
    cleanUp:function(){
	$("#thumbnails").empty();
    },
    uploadFile:function(){
	PlanetX.api("get", "https://apis.skplanetx.com/tcloud/token", "JSON", 
	    { "version" : 1, },
	    function(json){
		$("#uploadForm").attr("action",json.storage.token).submit();

	    });
    }
};



$(function(){
    navigator.geolocation.getCurrentPosition(function(geoPosition){
	currentLocation = geoPosition.coords;
	console.log("current position is set");

	TmapDemo.init();
    });
    TcloudDemo.init();

});
