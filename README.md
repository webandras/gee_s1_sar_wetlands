# gee_s1_sar_wetlands
Supplementary Material 1 to: *Gulácsi, A.; Kovács, F. Sentinel-1-Imagery-Based High-Resolution Water Cover Detection on Wetlands, Aided by Google Earth Engine. 2020.*

DOI link, citation will be available after it has been published in *Remote Sensing*.
This code is under MIT licence and can be used freely, but you need to credit me (András Gulácsi) as the author.


## Source code used for processing and downloading Sentinel-1 C-SAR data with Google Earth Engine

The following source code has a modular structure consisting of multiple files that are required in the main1 and main2 scripts. To make it work, duplicate the exact file structure in Google Earth Engine Code Editor as follows:

```raw
your_folder_name
│   main1
│   main2
├───process
│       classifier
│       exportData
│       inputDate
│       refinedLeeFilter
│
└───utils
        chartClusters
        dataFunctions
        studyArea
```

Change the path argument of the `require()` functions to your path. For example, change line 11 in `main1` script: replace the highlighted part to your Google username and `your_folder_name`. 

```javascript
// Import date functions module
var date = require('users/gulandras90/inlandExcessWater:process/inputDate');
```

Also change lines 14 and 17 in `main1` script. In `main2` script, change lines 24 and 27 (paths to your radar images saved in your Assets folder by the main1 script), and lines 33, 41, 44 and 47. In `process/inputDate`, change line 4.

## Why is the main script splitted into 2 parts (main1 and main2)?

> One way your algorithms get parallelized in Earth Engine is by splitting the inputs into tiles, running the same computation separately on each tile, then combining the results. As a consequence, all of the inputs necessary to compute an output tile have to fit into memory. [Read more about it.](https://developers.google.com/earth-engine/debugging#user-memory-limit-exceeded)

Unfortunately, the refined Lee filter uses arrays and they have to be loaded into memory all at once (in one tile). If the array is gigantic, the user memory limit will be exceeded and thereby will throw an error. Quota restrictions, like the memory limit per user, exist to ensure the availability of computing resources for the entire Earth Engine community.



## Links 
[Open the scripts in Google Earth Engine app](https://code.earthengine.google.com/?accept_repo=users/gulandras90/inlandExcessWater)
*You only have reading rights.*

