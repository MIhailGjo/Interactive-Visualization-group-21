// Main chart (zoom/pan, tooltips, highlighting)
const margin = {top: 40, right: 40, bottom: 60, left: 80};
const width = 900 - margin.left - margin.right;
const height = 450 - margin.top - margin.bottom;

// Overview chart (brushing filters the main chart)
const overviewHeight = 80;

const t = 750; // transition length in ms

let allData = []
let filteredData = []

const svg = d3.select('#mainChart')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

const overviewSvg = d3.select('#overviewChart')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', overviewHeight + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

function init(){
    // TODO: put your CSV in data/ and update the file name and row conversion
    d3.csv('./data/data.csv', d => ({
        // e.g. year: +d.year,
    }))
    .then(data => {
        console.log(data)
        allData = data
        filteredData = data
        setupSelector()
        updateAxes()
        updateVis()
        setupBrush()
        setupZoom()
    }).catch(error => console.error('Error loading data:', error));
}

window.addEventListener('load', init);

function setupSelector(){
    // Dynamic filters: fill the dropdown and update the chart on change
    // Reset button: clear filters, brush and zoom
}

function updateAxes(){
    // Build scales and draw axes + labels for both charts
}

function updateVis(){
    // Draw (or update) the marks in the main chart from filteredData
    // Add mouseover / mouseout here for tooltips and highlighting
}

function setupBrush(){
    // d3.brushX() on overviewSvg; on brush, filter allData and call updateVis()
}

function setupZoom(){
    // d3.zoom() on the main chart; rescale the axes and reposition marks on zoom
}
