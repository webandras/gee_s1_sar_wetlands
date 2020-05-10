// Save the Sentinel-1 composite image / or just one band as GeoTIFF to Drive.

exports.saveCompositeBand = function(composite, scale, description, yearMonth, studyArea) {
  Export.image.toDrive({
    image: composite,
    description: description+yearMonth,
    scale: scale,
    region: studyArea
  });
};