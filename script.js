//init animations (once page is ready)
$(function() {
    AOS.init();
});

//function to retrieve coin names and api-friendly names for input validation/datalist
async function getCoinList(){

    //get list of coins
    const res = await fetch('https://api.coingecko.com/api/v3/coins')
    const data = await res.json();
    const text = JSON.stringify(data);
    const obj = JSON.parse(text);

    //iterate over JSON to populate dict
    coinNameDict={};
    for (let i = 0; i < obj.length; i++) {
        //var tempDict={};
        var id = obj[i].id;
        var name = obj[i].name;
        coinNameDict[name]=id;
    }

    //define list for options
    var coinList=Object.keys(coinNameDict)

    //use list to generate dropdown options for datalist under input box
    var list = document.getElementById('options');
    coinList.forEach(function(item){
    var option = document.createElement('option');
    option.value = item;
    list.appendChild(option);})
}

getCoinList();

//init Datepicker
$(document).ready(function() {
    $('.datepicker').datepicker();
});

//get today's date
var today = new Date();
var todayFormatted = (today.getMonth()+1)+'/'+today.getDate()+'/'+today.getFullYear(); //add 1 to month because original month format is "digital" i.e. 0-11 instead of 1-12

//calculate dates for predetermined ranges
var sevenDaysAgo = moment().subtract(7, 'days').format('MM/DD/YYYY');
var oneMonthAgo = moment().subtract(1, 'months').format('MM/DD/YYYY');
var sixMonthsAgo = moment().subtract(6, 'months').format('MM/DD/YYYY');
var oneYearAgo = moment().subtract(1, 'year').format('MM/DD/YYYY');

//functions for predetermined range buttons
function last7Days() {
    var temp=document.getElementById("startDate").value;
    temp=`${sevenDaysAgo}`
    document.getElementById("startDate").value=temp;

    var temp2=document.getElementById("endDate").value;
    temp2=todayFormatted
    document.getElementById("endDate").value=temp2;
    }

function lastMonth(){
    var temp=document.getElementById("startDate").value;
    temp=`${oneMonthAgo}`
    document.getElementById("startDate").value=temp;

    var temp2=document.getElementById("endDate").value;
    temp2=todayFormatted
    document.getElementById("endDate").value=temp2;
}

function last6Months(){
    var temp=document.getElementById("startDate").value;
    temp=`${sixMonthsAgo}`
    document.getElementById("startDate").value=temp;

    var temp2=document.getElementById("endDate").value;
    temp2=todayFormatted
    document.getElementById("endDate").value=temp2;
}

function lastYear(){
    var temp=document.getElementById("startDate").value;
    temp=`${oneYearAgo}`
    document.getElementById("startDate").value=temp;

    var temp2=document.getElementById("endDate").value;
    temp2=todayFormatted
    document.getElementById("endDate").value=temp2;
}

//main function
async function returnChart(){

    //start loading gif
    document.getElementById("loading").style.visibility = "visible";

    //set position for validation alert
    alertify.set('notifier','position', 'top-center');

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
    const data = await res.json();
    const text = JSON.stringify(data);
    const obj = JSON.parse(text);
    var prices = obj.prices
    var prices_text=JSON.stringify(prices)

    //clear previous chart from div
    document.getElementById('container').innerHTML = "";
    
    //create copy of data where unix timestamp has been converted to readable time so that datetime can be readable on tooltip
    prices_copy=JSON.parse(JSON.stringify(prices));

    for (i = 0; i < prices_copy.length; i++){
        
        var x = prices_copy[i][0];

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
        prices_copy[i][0]=x;
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
        var series1 = chart.spline(prices_copy); //set data set for chart, define series
        series1.name(`${coinNameInput} price`); //name series
        chart.container('container'); //specify what div to send it to


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

    //if regressions is checked, perform regression
    if(document.getElementById('regressionCheck').checked){
        
        //getting the regression object
        //the type of regression depends on the experimental data
        var result = regression('linear', prices);
          
        //get coefficients from the calculated formula
        var coeff = result.equation;
          
        //function that actually plots the data
        anychart.onDocumentReady(function () {
         
            var data_1 = prices;
            var data_2 = setTheoryData(prices);

            //copy formatted datetime values from prices_copy to regression object "data_2"
            for (i = 0; i < data_2.length; i++){
                data_2[i][0] = prices_copy[i][0]
            }

            chart = anychart.line();
                    
            chart.legend(true);
          
            // creating the first series (marker) and setting the experimental data
            var series1 = chart.line(prices_copy);
            series1.name(`${coinNameInput} price`);
            series1.markers(false);

            //function to format Y axis
            formatYAxis();
          
            // creating the second series (line) and setting the theoretical data
            var series2 = chart.line(data_2);
            series2.name("Regression price");
            series2.markers(false);

            //enable chart x-axis scroll
            chart.xScroller(true);
            
            //format prices in tooltip 
            var tooltip = chart.tooltip();
            tooltip.format("{%seriesName}: ${%value}{groupsSeparator:\\,, decimalsCount:2}")//have to escape commas with slashes
            
            //end loading gif
            document.getElementById("loading").style.visibility = "hidden";

            //draw chart and send to div
            chart.container("container");
            chart.draw();

            //call overOrUnder function
            overOrUnder();

            //define overOrUnder function
            function overOrUnder(){
    
                if(data_1[data_1.length-1][1] > data_2[data_2.length-1][1]){
                    //document.getElementById("under").style.textDecoration = "line-through";
                    //document.getElementById("over").style.textDecoration = "none";
                    document.getElementById("over").innerHTML='overvalued';
                    document.getElementById("under").innerHTML='';
                    document.getElementById("slash").innerHTML='';


                }
                else if(data_1[data_1.length-1][1] < data_2[data_2.length-1][1]){
                    //document.getElementById("over").style.textDecoration = "line-through";
                    //document.getElementById("under").style.textDecoration = "none";
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
        function setTheoryData(prices) {
            var theoryData = [];
            for (var i = 0; i < prices.length; i++) {
              theoryData[i] = [prices[i][0], formula(coeff, prices[i][0])];
            }
            return theoryData;
        }
    }
}