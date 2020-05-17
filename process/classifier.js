// Performs automatic classification on radar data
/* Args:
    input: radar data to classify
    region: area used for training
    scale: at which scale to apply the classifier
    label: add a label (string) to the classified layer
    clusterNumber: number of clusters to calculate (I use 15)
*/
exports.radarClassifier = function (input, region, scale, label, clusterNumber) {

  // Make the training dataset.
  var training = input.sample({
    region: region,
    scale: scale,
    numPixels: 10000
  });
  
  // Instantiate the clusterer and train it.
  // Weka kmeans clusterer
  var clusterer = ee.Clusterer.wekaKMeans(clusterNumber, 1).train(training);
  
  // Cluster the input using the trained clusterer.
  var result = input.cluster(clusterer);
  
  // Display the clusters with random colors.
  Map.addLayer(result.randomVisualizer(), {}, label);
  return result || undefined;
};