/* +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 * +++++                      Sentinel-1 Processing Tool                    ++++++
 * +++++                      Author: András Gulácsi                        ++++++
 * +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 */

// Default is true.
var withWindFiltering = true;

// Import date functions module
var date = require('users/gulandras90/inlandExcessWater:process/inputDate');

// Import Refined Lee speckle filtering module
var lee = require('users/gulandras90/inlandExcessWater:process/refinedLeeFilter');

// Add rectangle (the study area)
var region = require('users/gulandras90/inlandExcessWater:utils/studyArea');
region = region.addRegion();
// print(region);

// Create a Feature object using the rectangle
var studyArea = ee.Feature(region, { name: 'Felsõ-Kiskunság lakes'});

// Show object properies in the Console
// print(studyArea);

// Set the map view to the center of the study area
Map.centerObject(studyArea);


// Load the Sentinel-1 image collection
var sentinel1 = ee.ImageCollection('COPERNICUS/S1_GRD');

// coordinate pairs for filtering the collection
var point = ee.Geometry.Point(19.1753, 46.8156);



// just a title
var formLabel = ui.Label('Sentinel-1 C-SAR processing');
formLabel.style().set({
  fontSize: '28px',
  fontWeight: 700,
  color: '#aa3300',
  padding: '0px'
});



// User inputs: year and month
  var year = '2017';
  var month = '03';


var yearInput = ui.Textbox({
  placeholder: 'The year you want to process',
  value: '2017',
  onChange: function(text) {
    year = text;
  }
});

var yearInputLabel = ui.Label('The year you want to process:');
var monthInputLabel = ui.Label('The month you want to process (format: "03"):');

var monthInput = ui.Textbox({
  placeholder: 'The month you want to process (format: "03")',
  value: '03',
  onChange: function(text) {
    month = text;
  }
});


// User input for filtering ImageCollection by date (year, month)
var dateInput = date.dateInput(year, month);

// print(dateInput.start);
// print(dateInput.finish);
// print(dateInput.daysInMonth);


// Which path you want to process?
var path;
var pathList = {
  ASCENDING: 1,
  DESCENDING: 2
};

// Select day of the year from the list
var selectPath = ui.Select({
  items: Object.keys(pathList),
  placeholder: 'Select Path',
  onChange: function (key) {
    path = parseInt(key, 10);
  }
});

selectPath.style().set({
  maxWidth: '250px'
});

var selectPathLabel = ui.Label('Which path you want to process?');
selectPathLabel.style().set({
  fontSize: '14px',
  fontWeight: 400,
  color: '#444444',
  padding: '0px'
});


var calculateBtn = ui.Button({
  label: 'Start Processing!',
  onClick: function() {
    var path = selectPath.getValue();
    print(path);
    var year = yearInput.getValue();
    var month = monthInput.getValue();
    
    var dateInput = date.dateInput(year, month);
    // Filtering based on metadata properties
    var vh = sentinel1
      // Filter to get images with VV and VH dual polarization.
      .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
      .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
      // Filter to get images collected in interferometric wide swath mode.
      .filter(ee.Filter.eq('instrumentMode', 'IW'))
      // .filterBounds(region) // Starting from 08/2016 for DESC data. Use this line!
      .filterBounds(point) // Use this line for every other case
      .filterDate(dateInput.start, dateInput.finish)
    ;
    //.filterDate('2014-01-01', '2018-12-31');

    print(vh);

    var selectedPath;
    var pathString;
    if(path === 'ASCENDING') {
      // Filter to get images from different look angles.
      selectedPath = vh.filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'));
      pathString = 'ASC';
    } else if (path === 'DESCENDING') {
      // Filter to get images from different look angles.
      selectedPath = vh.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'));
      pathString = 'DESC';
    } else {
      pathString = null;
      throw new Error('Wrong user input', 'Allowed options (1: ASCENDING, 2: DESCENDING)');
    }


    // Function to apply angle correction (for VV)
    function toGammaVV(image) {
      return image.addBands(image.select('VV').subtract(image.select('angle')
        .multiply(Math.PI/180.0).cos().log10().multiply(10.0)).rename('VV_corr'));
    }
    // Function to apply angle correction (for VH)
    function toGammaVH(image) {
      return image.addBands(image.select('VH').subtract(image.select('angle')
        .multiply(Math.PI/180.0).cos().log10().multiply(10.0)).rename('VH_corr'));
    }

    // Use descending path only, do not mix it with ascending path!
    selectedPath = selectedPath.map(toGammaVV);
    selectedPath = selectedPath.map(toGammaVH);
    print(selectedPath);

    // variable to store lee-filtered radar data
    var leeFiltered;
    if (withWindFiltering === true) {
      // Get date property from the image collection, format it
    var dates = selectedPath.map(function(image) {
      return image.set('date', image.date().format('Y-MM-dd'));
    });

    // Get a list of the dates.
    var datesList = dates.aggregate_array('date');



    /* Get data from CFSV2: NCEP Climate Forecast System Version 2, 6-Hourly Products
      for the wind mask to eliminate surface roughening by wind */
    var ws = ee.List(datesList).map(function (date) {
      var wx = ee.ImageCollection('NOAA/CFSV2/FOR6H').filterDate(date);
      var vWind = wx.select(['v-component_of_wind_height_above_ground']);
      var a = vWind.max();
      var uWind = wx.select(['u-component_of_wind_height_above_ground']);
      var b = uWind.max();
      a = a.pow(2);
      b = b.pow(2);
      var ab = a.add(b);
      var ws = ab.sqrt();
      ws = ws.multiply(3.6);
      return ws.rename('windy').set('date', date);
    });

    print(ws);
    print(dates);


    // Define an inner join.
    var innerJoin = ee.Join.inner();

    // Specify an equals filter for image dates
    var filterDateEq = ee.Filter.equals({
      leftField: 'date',
      rightField: 'date'
    });

    // Apply the join. We have to join the wind data with the Sentinel-1 data
    // in order to apply a mask on VV and VH bands!
    var innerJoined = innerJoin.apply(dates, ee.ImageCollection(ws), filterDateEq);
    print(innerJoined);

    // Concatenate images to create an ImageCollection
    var joinedS1pol = innerJoined.map(function(feature) {
      return ee.Image.cat(feature.get('primary'), feature.get('secondary'));
    });
    print(joinedS1pol);

    // We need an explicit cast to ImageCollection so that GEE can understand the type to work with
    joinedS1pol = ee.ImageCollection(joinedS1pol);


    // Update mask to exlude areas where where the wind speed is >= 12 m/s
    var windMask = function (image) {
      var mask = ee.Image(0).where(image.select('windy').lt(12.0), 1);
      return image.updateMask(mask);
    };

    
    var windy = joinedS1pol.select('windy').mean().clip(studyArea);
    Map.addLayer(windy, { min: 10, max: 20 }, 'wind speed');


    // Reduce the region
    var meanDictionary = windy.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: studyArea.geometry(),
      scale: 20000, // data is 20 km by 20 km, so set it to 20.000 m
      maxPixels: 1e9
    });

    // The result is a Dictionary.  Print it.
    print('Average monthly wind speed in m/s: ');
    print(meanDictionary);
    
    // Apply the wind mask to remove areas > 12 m/s wind speed.
    joinedS1pol = joinedS1pol.map(windMask);
    print(joinedS1pol);
    
    windy = joinedS1pol.mean().clip(studyArea);
    // Reduce the region.
    meanDictionary = windy.select('windy').reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: studyArea.geometry(),
      scale: 20000,
      maxPixels: 1e9
    });

    // The result is a Dictionary.  Print it.
    print('After applying the wind mask: average monthly wind speed in m/s: ');
    print(meanDictionary);
    
    
    var angle = joinedS1pol.mean().clip(studyArea);
    // Reduce the region.
    meanDictionary = angle.select('angle').reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: studyArea.geometry(),
      scale: 20000,
      maxPixels: 1e9
    });
    
    // The result is a Dictionary.  Print it.
    print('After applying the wind mask: average monthly incidence angle: ');
    print(meanDictionary);
    
    Map.addLayer(angle, { min: 29, max: 46 }, 'incidence angle');

    // Map.addLayer(joinedS1pol.first().clip(studyArea));

    // Create a monthly composite from means at different polarizations and look angles.
    leeFiltered = ee.Image.cat([
      lee.toDB(
        lee.refinedLee(
          lee.toNatural(
            joinedS1pol.select('VH_corr').mean()
          )
        )
      ),
      lee.toDB(
        lee.refinedLee(
          lee.toNatural(
            joinedS1pol.select('VV_corr').mean()
          )
        )
      )
    ]).clip(studyArea);

    print(leeFiltered);
    Map.addLayer(leeFiltered, { min: [-20, -20], max: [-5, -5] }, 'radar result');
    } else if (withWindFiltering === false) {
      
      // Create a monthly composite from means at different polarizations and look angles.
      leeFiltered = ee.Image.cat([
        lee.toDB(
          lee.refinedLee(
            lee.toNatural(
              selectedPath.select('VH_corr').mean()
            )
          )
        ),
        lee.toDB(
          lee.refinedLee(
            lee.toNatural(
              selectedPath.select('VV_corr').mean()
            )
          )
        )
      ]).clip(studyArea);

      print(leeFiltered);
      Map.addLayer(leeFiltered, { min: [-20, -20], max: [-5, -5] }, 'radar result without wind-corr');
    }


    // Outline for the study area
    Map.addLayer(ee.Image().paint(region, 0, 2), {}, 'Study Area');


    if (withWindFiltering === true) {
      // Save leeFiltered VH and VV bands
      // Export the image as an Earth Engine asset.
      Export.image.toAsset({
        image: leeFiltered,
        description: 'Sentinel_1_lee_' + pathString + '_' + dateInput.year + dateInput.month,
        assetId: 'Sentinel_1_lee_' + pathString + '_' + dateInput.year + dateInput.month,
        scale: 10,
        region: region
      });


      // If you want to download it to your Google Drive cloud storage
      // Export.image.toDrive({
      //   image: leeFiltered,
      //   description: 'Sentinel_1_lee_' + pathString + '_' + dateInput.year + dateInput.month,
      //   scale: 10,
      //   region: region
      // });
    } else if (withWindFiltering === false) {
      // Save leeFiltered VH and VV bands
      // Export the image as an Earth Engine asset.
      Export.image.toAsset({
        image: leeFiltered,
        description: 'Sentinel_1_lee_' + pathString + '_' + dateInput.year + dateInput.month + '_no_wind_corr',
        assetId: 'Sentinel_1_lee_' + pathString + '_' + dateInput.year + dateInput.month + '_no_wind_corr',
        scale: 10,
        region: region
      });
      
    }

  }
});

calculateBtn.style().set({
  fontSize: '24px',
  fontWeight: 700,
  color: '#000000',
  padding: '10px',
  margin: '30px 10px 10px 10px',
  border: '2px dashed #00aa33',
  minHeight: '60px',
  maxWidth: '200px'
});



print(formLabel);

print(yearInputLabel);
print(yearInput);

print(monthInputLabel);
print(monthInput);

print(selectPathLabel);
print(selectPath);

print(calculateBtn);




