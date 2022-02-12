//init animations (once page is ready)
$(function() {
    AOS.init();
});

//set position for validation alert
$(function() {
    alertify.set('notifier','position', 'top-center');
});

//function to retrieve coin names and api-friendly names for input validation/datalist
async function getCoinList(){

    //get list of coins and passes to parseCoinList
    return await fetch('https://api.coingecko.com/api/v3/coins')
    .then((response)=>response.json())
    .then((responseJson)=>{parseCoinList(responseJson)});

}

//parses returned coin name JSON and adds it to options for Coin Name input
function parseCoinList(obj){

    //iterate over JSON to populate dict
    coinNameDict={};
    for (let i = 0; i < obj.length; i++) {
        var id = obj[i].id;
        var name = obj[i].name;
        coinNameDict[name]=id;
    }

    //define list for options
    var coinList=Object.keys(coinNameDict)

    //use list to generate dropdown options for datalist under input box
    var optionsList = document.getElementById('coinOptions');
    coinList.forEach(function(item){
        var option = document.createElement('option');
        option.value = item;
        optionsList.appendChild(option);
    })
}

//have to doc.ready this one as a subprocess of the function accesses a DOM object
$(function() {
    getCoinList();
});

//init Datepicker
$(document).ready(function() {
    $('.datepicker').datepicker();
});

//get today's date
var today = new Date();
var todayFormatted = today.toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: 'numeric'})

//calculate dates for predetermined ranges
var sevenDaysAgo = moment().subtract(7, 'days').format('MM/DD/YYYY');
var oneMonthAgo = moment().subtract(1, 'months').format('MM/DD/YYYY');
var sixMonthsAgo = moment().subtract(6, 'months').format('MM/DD/YYYY');
var oneYearAgo = moment().subtract(1, 'year').format('MM/DD/YYYY');

//populate inputs onclick with selected dates
function presetDates(timeframe){

    switch(timeframe){
        case 'sevenDaysAgo':
            startDatePreset=`${sevenDaysAgo}`;
            break;
        case 'oneMonthAgo':
            startDatePreset=`${oneMonthAgo}`;
            break;
        case 'sixMonthsAgo':
            startDatePreset=`${sixMonthsAgo}`;
            break;
        case 'oneYearAgo':
            startDatePreset=`${oneYearAgo}`;
            break;
    }

    document.getElementById("startDate").value=startDatePreset;
    document.getElementById("endDate").value=todayFormatted;

}

//main function
async function returnChart(){

    //start loading gif
    document.getElementById("loading").style.visibility = "visible";

    //get user inputs
    var coinNameInput = document.getElementById('coinName').value;
    var startDate = document.getElementById('startDate').value;
    var endDate = document.getElementById('endDate').value;

    //validate inputs
    if(Object.keys(coinNameDict).includes(coinNameInput)==false | startDate=='' | endDate==''){
        
        if(Object.keys(coinNameDict).includes(coinNameInput)==false){
            alertify.error('Please choose a valid coin name');
            document.getElementById("loading").style.visibility = "hidden";
        }

        if(startDate==''|endDate==''){
            alertify.error('Please fill in both dates');
            document.getElementById("loading").style.visibility = "hidden";
        }

        return;
    }

    //retrieves URL-friendly coin name from coinNameDict
    coinName = coinNameDict[coinNameInput]; 

    //convert dates to UNIX timestamps
    var unixStart = new Date(startDate).getTime() / 1000
    var unixEnd = new Date(endDate).getTime() / 1000

    //fetch API data
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinName}/market_chart/range?vs_currency=usd&from=${unixStart}&to=${unixEnd}`)
    const obj = await res.json();
    var prices = obj.prices

    //clear previous chart from div
    document.getElementById('chartContainer').innerHTML = "";
    
    //create copy of data where unix timestamp has been converted to readable time so that datetime can be readable on tooltip
    pricesReadable=JSON.parse(JSON.stringify(prices));

    for (i = 0; i < pricesReadable.length; i++){
        
        var x = pricesReadable[i][0];

        //convert datetime format
        var x = new Date(x);
        var year = x.getYear()-100;
        var date = x.getDate();
        var month = x.getMonth()+1;
        var time = x.toLocaleTimeString();

        //remove seconds from time
        time = time.slice(0,-6)+time.slice(-3)
        x = month +'/'+date+'/'+year+' '+time;

        //reassign value in list
        pricesReadable[i][0]=x;
    }

    //format y axis data
    function formatYAxis(){

        //format y-axis values (add $ and commas)
        chart.yAxis().labels().format(function(){
            var b = this.value;
            var b = b.toLocaleString();
            var b = "$" + b;
            return b;
        })

    }

    //if regression is unchecked, show only line graph
    if(document.getElementById('regressionCheck').checked==false){

        //reset site h1 header from over/under function
        document.getElementById("over").innerHTML='over';
        document.getElementById("under").innerHTML='under';
        document.getElementById("slash").innerHTML='/';
        
        //create chart
        var chart = anychart.line(); //set type of chart (line)
        var priceSeries = chart.spline(pricesReadable); //set data set for chart, define series
        priceSeries.name(`${coinNameInput} price`); //name series
        chart.container('chartContainer'); //specify what div to send it to

        //format price in tooltip 
        var tooltip = chart.tooltip();
        tooltip.format("{%seriesName}: ${%value}{groupsSeparator:\\,, decimalsCount:2}")//have to escape commas with slashes

        chart.legend(true);

        //end loading gif
        document.getElementById("loading").style.visibility = "hidden";

        //draw the chart
        chart.draw(); 

        //enable axis labels
        var labels = chart.xAxis().labels();
        labels.enabled(true);

        //function to format Y axis
        formatYAxis();

        //enable x-axis scroll 
        chart.xScroller(true);

    }

    //if regression is checked, perform regression
    if(document.getElementById('regressionCheck').checked){
        
        //getting the regression object
        //the type of regression depends on the experimental data
        var result = regression('linear', prices);
          
        //get coefficients from the calculated formula
        var coeff = result.equation;
          
        //function that actually plots the data
        anychart.onDocumentReady(function () {
         
            var priceData = prices;
            var regressionData = returnRegressionData(prices);

            //copy formatted datetime values from pricesReadable to regression object "regressionData"
            for (i = 0; i < regressionData.length; i++){
                regressionData[i][0] = pricesReadable[i][0]
            }

            chart = anychart.line();
                    
            chart.legend(true);
          
            // creating the first series (marker) and setting the experimental data
            var priceSeries = chart.line(pricesReadable);
            priceSeries.name(`${coinNameInput} price`);
            priceSeries.markers(false);

            //function to format Y axis
            formatYAxis();
          
            // creating the second series (line) and setting the theoretical data
            var regressionSeries = chart.line(regressionData);
            regressionSeries.name("Regression price");
            regressionSeries.markers(false);

            //enable x-axis scroll
            chart.xScroller(true);
            
            //format prices in tooltip 
            var tooltip = chart.tooltip();
            tooltip.format("{%seriesName}: ${%value}{groupsSeparator:\\,, decimalsCount:2}")//have to escape commas with slashes
            
            //end loading gif
            document.getElementById("loading").style.visibility = "hidden";

            //draw chart and send to div
            chart.container("chartContainer");
            chart.draw();

            //call overOrUnder function
            overOrUnder();

            //define overOrUnder function
            function overOrUnder(){
    
                if(priceData[priceData.length-1][1] > regressionData[regressionData.length-1][1]){

                    document.getElementById("over").innerHTML='overvalued';
                    document.getElementById("under").innerHTML='';
                    document.getElementById("slash").innerHTML='';

                }
                else if(priceData[priceData.length-1][1] < regressionData[regressionData.length-1][1]){

                    document.getElementById("over").innerHTML='undervalued';
                    document.getElementById("under").innerHTML='';
                    document.getElementById("slash").innerHTML='';

                }
                
            }

        });
          
        //input X and calculate Y using the formula found
        //this works with all types of regression
        function formula(coeff, x) {
            var result = null;
            for (var i = 0, j = coeff.length - 1; i < coeff.length; i++, j--) {
              result += coeff[i] * Math.pow(x, j);
            }
            return result;
        }
          
        //setting theoretical data array of [X][Y] using experimental X coordinates
        //this works with all types of regression
        function returnRegressionData(prices) {
            var theoryData = [];
            for (var i = 0; i < prices.length; i++) {
              theoryData[i] = [prices[i][0], formula(coeff, prices[i][0])];
            }
            return theoryData;
        }
    }
}