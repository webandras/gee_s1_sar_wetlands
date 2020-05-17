/* Date functions for handling leap years,
getting the days in current month etc.  */


// Function returns true if leap year, false otherwise
exports.isLeapYear = function(year) {
  return (year % 4 === 0 && year !== 100) || year % 400 === 0;
};

// Gets the number of days in any month in a year
exports.getDaysInMonth = function(year, month) {
  var leapYear = exports.isLeapYear(parseInt(year, 10));
  var daysInMonth = 0;
  var monthNumber = parseInt(month, 10);

  if (monthNumber === 2) {
    leapYear ? daysInMonth = 29 : daysInMonth = 28;
  }
  else if (
    monthNumber === 4 ||
    monthNumber === 6 ||
    monthNumber === 9 ||
    monthNumber === 11
  ){
    daysInMonth = 30;
  }
  else if (
    monthNumber === 1 ||
    monthNumber === 3 ||
    monthNumber === 5 ||
    monthNumber === 7 ||
    monthNumber === 8 ||
    monthNumber === 10 ||
    monthNumber === 12
  ){
    daysInMonth = 31;
  }
  else {
    return null;
  }
  
  return daysInMonth;
};
