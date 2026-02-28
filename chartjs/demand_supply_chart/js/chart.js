/*global Point, Path, Size, Rectangle, Layer, Group, PointText, project, view, Color*/

// Preferences: style, color, margins etc.
var prefs = {
	color: {
		supply: [
			"#e6550d",  // Dark orange
			"#fd8d3c",  // Medium orange
			"#fdbe85",  // Light orange
		],
		demand: [  
			"#08519c",  // Dark blue
			"#3182bd",  // Medium orange
			"#6baed6",  // Light blue
		],
		disabledButton: "#cccccc",
		buttonText: "white"
	},
	margin: {
		left: 50,
		right: 125,
		top: 40,
		bottom: 40
	},
	lineStyle: {
		supplyDemand: {
			strokeWidth: 8,
			strokeCap: "round"
		},
		intersection: {
			strokeColor: "#888888",
			strokeWidth: 3,
			strokeCap: "butt",
			dashArray: [10, 6]
		},
		intersectionHover: {
			strokeColor: "#cccccc",
			strokeWidth: 3,
			strokeCap: "butt",
			dashArray: [10, 6]
		},
		axis: {
			strokeColor: "black",
			strokeWidth: 2,
		},
	},
	textStyle: {
		axisLabel: {
			color: "black",
			fontFamily: "'Roboto', 'sans-serif'",
			fontSize: 28
		},
		supplyDemandLabel: {
			fontFamily: "'Roboto', 'sans-serif'",
			fontSize: 32
		},
		buttonLabel: {
			fontFamily: "'Roboto', 'sans-serif'",
			fontSize: 20,
			fontWeight: "bold"
		}
	},
	layout: {
		supplyDemandButton: {
			width: 50,
			height: 32, 
			spacing: 10,
			horizontalOffset: 110,
			cornerRadius: 10
		}
	},
	ui: {
		axisHoverArea: {
			size: 80,
			offset: 5
		}
	}
};

// Data: supply, demand, price and quantity line position and visibility.
var data = {
	lines: [
			{
				index: 0,
				label: "",
				type: "supply",
				start: {x: 0.0, y: 0.2},
				end: {x: 1.0, y: 0.7},
				color: prefs.color.supply[0],
				visible: true
			},
			{
				index: 1,
				label: "",
				type: "supply",
				start: {x: 0.0, y: 0.1},
				end: {x: 1.0, y: 0.6},
				color: prefs.color.supply[2],
				visible: false
			},
			{
				index: 0,
				label: "",
				type: "demand",
				start: {x: 0.0, y: 0.7},
				end: {x: 1.0, y: 0.2},
				color: prefs.color.demand[0],
				visible: true
			},
			{
				index: 1,
				label: "",
				type: "demand",
				start: {x: 0.0, y: 0.6},
				end: {x: 1.0, y: 0.1},
				color: prefs.color.demand[2],
				visible: false
			}
		],
	priceQuantityLines: []
}

var pivotPointIndicatorCircle;

var xAxisLabelText = "";  // Quantity
var yAxisLabelText = "";  // Price

//Temporary price and quantity line when hovering near axis
var tempPriceQuantityLineData = null;
var startCreateTempPriceQuantityLine = false; 

//Create the charts
createChart(data, prefs);

var safeBox = createSafeBoxDimensions( view.bounds, prefs.margin );
var chartBoundaries = createChartDimensions(safeBox);

//Area to register boundaries of dragging of chart lines
var dragBoundaries = new Rectangle(view.bounds.x, chartBoundaries.y, view.bounds.width, chartBoundaries.height);

var selectedSegment, selectedPath;

/* exported onResize */
function onResize(){
	safeBox = createSafeBoxDimensions( view.bounds, prefs.margin );
	chartBoundaries = createChartDimensions(safeBox);
	updateChart(data, prefs);
}

/**
 * Constrain a given value between a maximum and minimum value
 * @param {Number} value 
 * @param {Number} min 
 * @param {Number} max 
 */
function constrain(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

/**
 * Create box to contain
 * @param {*} containerRectangle 
 * @param {*} margin 
 */
function createSafeBoxDimensions(bounds, margin){
	var x = margin.left;
	var y = margin.top;
	var w = bounds.width - (margin.left + margin.right);
	var h = bounds.height - (margin.top + margin.bottom);
	return new Rectangle(new Point(x, y), new Size(w, h));
}

/**
 * Create chart dimensions based on a container rectangle and a margin to offset from that rectagle
 * @param {*} bounds 
 */
function createChartDimensions(bounds) {
	var size = Math.min(bounds.width, bounds.height);
	
	// Chart settings
	var chartSize = new Size(size, size);
	var chartBoundaries = new Rectangle( new Point(0, 0), chartSize);
	chartBoundaries.center = bounds.center;

	return chartBoundaries;
}

/**
 * Create the chart and its elements.
 * @param {*} data 
 * @param {*} prefs 
 */
function createChart( data, prefs) {
	project.clear();
	
	project.addLayer(new Layer({name: "prototype"}));
	
	pivotPointIndicatorCircle = Path.Circle({center: [0,0], radius: 30});
	pivotPointIndicatorCircle.strokeWidth = 1;
	pivotPointIndicatorCircle.fillColor = "#eee";
	pivotPointIndicatorCircle.visible = false;
	project.layers["prototype"].addChild(pivotPointIndicatorCircle);

	project.addLayer(new Layer({name: "equilibriumLines"}));
	project.addLayer(new Layer({name: "tempPriceQuantityLines"}));
	project.addLayer(new Layer({name: "priceQuantityLines"}));
	project.addLayer(new Layer({name: "axes"}));
	project.addLayer(new Layer({name: "supplyDemandLines"}));
	project.addLayer(new Layer({name: "ui"}));

	updateChart(data, prefs);
}

/**
 * Update elements of chart and its boundaries.
 * @param {*} data 
 * @param {*} prefs 
 */
function updateChart(data, prefs) {
	//Reset chart boundaries
	var safeBox = createSafeBoxDimensions( view.bounds, prefs.margin );
	var chartBoundaries = createChartDimensions(safeBox);

	//For each layer remove children and recreate them.
	project.layers["axes"].activate();
	project.layers["axes"].removeChildren();
	createPriceQuantityHoverAreas(chartBoundaries);
	createAxes( xAxisLabelText, yAxisLabelText, chartBoundaries );
	
	project.layers["supplyDemandLines"].activate();
	project.layers["supplyDemandLines"].removeChildren();
	createSupplyDemandLines( data.lines, chartBoundaries );

	project.layers["equilibriumLines"].activate();
	project.layers["equilibriumLines"].removeChildren();
	createIntersectionLines( project.layers["supplyDemandLines"], chartBoundaries );

	project.layers["priceQuantityLines"].activate();
	project.layers["priceQuantityLines"].removeChildren();
	createPriceQuantityLines( data.priceQuantityLines, chartBoundaries );

	project.layers["ui"].activate();
	project.layers["ui"].removeChildren();
	createChartLineButtons( project.layers["supplyDemandLines"] );
}

/**
 * Create layer with lines for charts axis 
 * @param {Rectangle} chartBoundaries 
 */
function createAxes( xAxisLabelText, yAxisLabelText, chartBoundaries ) {
	var leftAxis = new Path.Line(chartBoundaries.topLeft, chartBoundaries.bottomLeft);
	leftAxis.style = prefs.lineStyle.axis;

	var bottomAxis = new Path.Line(chartBoundaries.bottomLeft, chartBoundaries.bottomRight);
	bottomAxis.style = prefs.lineStyle.axis;

	createAxisLabels( xAxisLabelText, yAxisLabelText, chartBoundaries );
}

/**
 * Create area near axes that when user hovers will draw temporary price or quantity lines.
 * @param {*} chartBoundaries 
 */
function createPriceQuantityHoverAreas(chartBoundaries) {
	var leftOriginX = chartBoundaries.topLeft.x - prefs.ui.axisHoverArea.size - prefs.ui.axisHoverArea.offset;
	var leftOrigin = new Point(leftOriginX, chartBoundaries.topLeft.y);
	var leftSize = new Size(prefs.ui.axisHoverArea.size, chartBoundaries.height);
	var leftAxisHoverArea = new Path.Rectangle(leftOrigin, leftSize);

	var bottomOrigin = new Point(chartBoundaries.bottomLeft.x, chartBoundaries.bottomLeft.y + prefs.ui.axisHoverArea.offset);
	var bottomSize = new Size(chartBoundaries.width, prefs.ui.axisHoverArea.size);
	var bottomAxisHoverArea = new Path.Rectangle(bottomOrigin, bottomSize);

	leftAxisHoverArea.fillColor = new Color(1.0,1.0, 1.0, 0.1);
	bottomAxisHoverArea.fillColor = new Color(1.0,1.0, 1.0, 0.1);

	//Function to create temp lines
	var createPriceQuantityLineData = function (type, point, label, chartBoundaries) {
		var value;
		if(type === "quantity") {
			point.x = constrain(point.x, chartBoundaries.left, chartBoundaries.right);
			value = getUnitPosition(point, chartBoundaries).x;
		} else {
			point.y = constrain(point.y, chartBoundaries.top, chartBoundaries.bottom);
			value = getUnitPosition(point, chartBoundaries).y;
		}	

		priceQuantityLineData = {
			label: label,
			type: type,
			value: value
		};

		return priceQuantityLineData;
	}

	//Function for removing temporary lines
	var removeTemporaryLines = function(event) {
		project.layers["tempPriceQuantityLines"].removeChildren();
	}

	leftAxisHoverArea.onMouseDown = function(event) {
		startCreateTempPriceQuantityLine = true;
		project.layers["tempPriceQuantityLines"].removeChildren();
		project.layers["tempPriceQuantityLines"].activate();
		var tempLineData = createPriceQuantityLineData("price", event.point, "", chartBoundaries);
		drawPriceQuantityLine(tempLineData, chartBoundaries, prefs.lineStyle.intersectionHover);
	};

	bottomAxisHoverArea.onMouseDown = function(event) {
		startCreateTempPriceQuantityLine = true;
		project.layers["tempPriceQuantityLines"].removeChildren();
		project.layers["tempPriceQuantityLines"].activate();
		var tempLineData = createPriceQuantityLineData("quantity", event.point, "", chartBoundaries);
		drawPriceQuantityLine(tempLineData, chartBoundaries, prefs.lineStyle.intersectionHover);
	};

	//Update any temporary price (horizontal) lines
	leftAxisHoverArea.onMouseDrag = function(event) {
		project.layers["tempPriceQuantityLines"].removeChildren();
		project.layers["tempPriceQuantityLines"].activate();
		var tempLineData = createPriceQuantityLineData("price", event.point, "", chartBoundaries);
		drawPriceQuantityLine(tempLineData, chartBoundaries, prefs.lineStyle.intersectionHover);
	}
	
	//Update any temporary quantity (vertical) lines
	bottomAxisHoverArea.onMouseDrag = function(event) {
		project.layers["tempPriceQuantityLines"].removeChildren();
		project.layers["tempPriceQuantityLines"].activate();
		var tempLineData = createPriceQuantityLineData("quantity", event.point, "", chartBoundaries);
		drawPriceQuantityLine(tempLineData, chartBoundaries, prefs.lineStyle.intersectionHover);
	}

	//Create persistent line on mouse up
	leftAxisHoverArea.onMouseUp = function(event) {
		if(startCreateTempPriceQuantityLine) {
			var lineData = createPriceQuantityLineData("price", event.point, "P₀", chartBoundaries);
	
			data.priceQuantityLines = [lineData];
			updateChart(data, prefs);

			startCreateTempPriceQuantityLine = false;
		}
		removeTemporaryLines()
	}

	bottomAxisHoverArea.onMouseUp = function(event) {
		if(startCreateTempPriceQuantityLine) {
			var lineData = createPriceQuantityLineData("quantity", event.point, "Q₀", chartBoundaries);
	
			data.priceQuantityLines = [lineData];
			updateChart(data, prefs);
	
			startCreateTempPriceQuantityLine = false;
		}
		removeTemporaryLines()
	}

	// Remove any temporary price lines
	leftAxisHoverArea.onMouseLeave = removeTemporaryLines;

	// Remove any temporary quantity lines
	bottomAxisHoverArea.onMouseLeave = removeTemporaryLines;
}



/**
 * Create labels for chart axis
 * @param {String} xAxisLabelText 
 * @param {String} yAxisLabelText 
 * @param {Rectangle} chartBoundaries 
 */
function createAxisLabels( xAxisLabelText, yAxisLabelText, chartBoundaries ){
	var xLabelPosition = new Point(chartBoundaries.bottomRight);
	xLabelPosition.y += 75;
	var xAxisLabel = new PointText( xLabelPosition );
	xAxisLabel.style = prefs.textStyle.axisLabel;
	xAxisLabel.justification = "right";
	xAxisLabel.content = xAxisLabelText;

	var yLabelPosition = new Point(chartBoundaries.topLeft);
	yLabelPosition.x -= 60;
	yLabelPosition.y += prefs.textStyle.axisLabel.fontSize;
	var yAxisLabel = new PointText( yLabelPosition );
	yAxisLabel.style = prefs.textStyle.axisLabel;
	yAxisLabel.justification = "right";
	yAxisLabel.content = yAxisLabelText;	
}

/**
 * Create the supply and demand lines of the chart
 * @param {*} chartLineData 
 * @param {*} chartBoundaries 
 */
function createSupplyDemandLines( chartLineData, chartBoundaries ){
	for(var i = 0; i < chartLineData.length; i++) {
		var lineData = chartLineData[i];
		createLine( lineData, chartBoundaries );
	}
}

/**
 * Create label for line given type, index and label from lineData.
 * @param {*} lineData 
 */
function createLabel (lineData) {
	var subscriptNumerals = ['\u2080','\u2081','\u2082','\u2083','\u2084','\u2085','\u2086','\u2087','\u2088','\u2089'];
	return lineData.label === '' ? lineData.type[0].toUpperCase() + subscriptNumerals[lineData.index] : lineData.label;
}

/**
 * Create a single chart line supply or demand
 * @param {*} lineData Data representing the line (start and end points, label, etc.)
 * @param {*} chartBoundaries Boundaries of the chart
 */
function createLine( lineData, chartBoundaries ) {

	var startPoint = getChartPosition(lineData.start.x, lineData.start.y, chartBoundaries);
	var endPoint = getChartPosition(lineData.end.x, lineData.end.y, chartBoundaries);

	//Create new label
	var labelPosition = new Point(endPoint);
	if( endPoint.x >= chartBoundaries.right) {
		labelPosition.x += 10;
	} else if(endPoint.y > chartBoundaries.top) {
		labelPosition.y += 35;
	} else {
		labelPosition.y -= 10;
	}
	

	var label = new PointText( {
		point: labelPosition,
		name: "label",
		fillColor: lineData.color,
		content: createLabel(lineData),
		style: prefs.textStyle.supplyDemandLabel
	} );

	//Create new path
	var linePath = new Path.Line(startPoint, endPoint);
	linePath.style = prefs.lineStyle.supplyDemand;
	linePath.strokeColor = lineData.color;
	linePath.name = "path";

	linePath.onMouseDown = function(event) {
		var hitResults = this.hitTest(event.point);

		if(!hitResults) {
			return;
		}

		selectedPath = hitResults.item;

		if( hitResults.type == 'segment') {
			//Start rotation
			selectedSegment = hitResults.segment;
		} else if( hitResults.type == 'stroke' ) {
			//Start drag
			selectedSegment = null;
		} else {
			selectedPath = null;
		}
	}

	linePath.onMouseDrag = function (event){
		if( selectedPath ) {
			var parentGroup = selectedPath.parent;

			if(selectedSegment) {
				//ROTATE line around intersection with counterpart
				
				var supplyDemandLines = project.layers["supplyDemandLines"].children;
				
				var pivot = findPivot(parentGroup, supplyDemandLines);
				
				if( pivot === null) {
					if(selectedSegment === selectedPath.firstSegment) {
						pivot = new Point(selectedPath.lastSegment.point);
					} else {
						pivot = new Point(selectedPath.firstSegment.point);
					}
				}

				var intersection = getLineBoundaryIntersections(event.point, pivot, chartBoundaries);

				selectedPath.firstSegment.point = intersection.start;
				selectedPath.lastSegment.point = intersection.end;

				pivotPointIndicatorCircle.position = pivot;
				pivotPointIndicatorCircle.visible = true;
			} else {
				//DRAG line horizontally or vertically
				
				var topEdge = selectedPath.bounds.top + event.delta.y;
				var bottomEdge = selectedPath.bounds.bottom + event.delta.y;
				
				if( event.point.isInside(chartBoundaries) ) {
					selectedPath.position += event.delta;
					var chartEdgeIntersection = getLineBoundaryIntersections(selectedPath.firstSegment.point, selectedPath.lastSegment.point, chartBoundaries);
					selectedPath.firstSegment.point = new Point(chartEdgeIntersection.start);
					selectedPath.lastSegment.point = new Point(chartEdgeIntersection.end);
				}
				
				//selectedPath.position.y = constrain(selectedPath.position.y + event.delta.y, chartBoundaries.top, chartBoundaries.bottom);
			}

			parentGroup.children["label"].point.y = selectedPath.lastSegment.point.y;
			
			var unitStartPoint = getUnitPosition( selectedPath.firstSegment.point, chartBoundaries );
			var unitEndPoint = getUnitPosition(selectedPath.lastSegment.point, chartBoundaries );
			
			parentGroup.data.start.x = unitStartPoint.x;
			parentGroup.data.start.y = unitStartPoint.y;
			parentGroup.data.end.x = unitEndPoint.x;
			parentGroup.data.end.y = unitEndPoint.y;
		}

		updateChart(data, prefs);
	}

	linePath.onMouseUp = function (event) {
		selectedPath = false;
		selectedSegment = false;

		pivotPointIndicatorCircle.visible = false;
	}

	//Create new group
	var chartLineGroup = new Group([ linePath, label ])
	chartLineGroup.name = lineData.label;
	chartLineGroup.data = lineData;

	chartLineGroup.visible = lineData.visible;
}

/**
 * Create horizontal and vertical lines representing price or quantity
 * @param {*} priceQuantityLineData 
 * @param {*} chartBoundaries 
 */
function createPriceQuantityLines( priceQuantityLineData, chartBoundaries ) {
	if(priceQuantityLineData) {
		for(var i = 0; i < priceQuantityLineData.length; i++){
			lineData = priceQuantityLineData[i];
			drawPriceQuantityLine( lineData, chartBoundaries, prefs.lineStyle.intersection );
		}
	}
}

function drawPriceQuantityLine( lineData, chartBoundaries, lineStyle ) {
	var startPoint, endPoint;

	//Find start and end points
	if(lineData.type === "price") {
		//Draw horizontal line for price
		startPoint = getChartPosition(0, lineData.value, chartBoundaries);
		endPoint = getChartPosition(1.0, lineData.value, chartBoundaries);
	} else {
		//Otherwise draw vertical line for quantity
		startPoint = getChartPosition(lineData.value, 0, chartBoundaries);
		endPoint = getChartPosition(lineData.value, 1.0, chartBoundaries);
	}
	
	//Create new path
	var linePath = new Path.Line(startPoint, endPoint);
	linePath.style = lineStyle;
	linePath.name = "path";

	//Create new label
	var labelPosition = new Point(startPoint);
	if(lineData.type === "price") {
		labelPosition.x -= 40;
	} else {
		labelPosition.y += 30;
	}
	
	var label = new PointText( {
		point: labelPosition,
		name: "label",
		fillColor: lineData.color,
		content: lineData.label,
		style: prefs.textStyle.supplyDemandLabel
	} );

	//Find intersections between line and supply and demand lines
	var intersections = [];
	var supplyDemandLines = project.layers["supplyDemandLines"].children;

	for( var i = 0; i < supplyDemandLines.length; i++) {
		if(supplyDemandLines[i].visible) {
			var crossings = linePath.getCrossings(supplyDemandLines[i].children["path"]);
			for(var j = 0; j < crossings.length; j++) {
				intersections.push(crossings[j]);
			}
		}
	}

	for( var i = 0; i < intersections.length; i++) {
		var intersectionEndPoint;

		//Check if line is price (horizontal) or quantity (vertical)
		if(lineData.type === "price") {
			//Draw vertical intersection lines for price (which is horizontal)
			intersectionEndPoint = new Point(intersections[i].point.x, chartBoundaries.bottom);
		} else {
			//Draw horizontal intersection lines for quantity (which is vertica)
			intersectionEndPoint = new Point(chartBoundaries.left, intersections[i].point.y);
		}
		
		var intersectionLine = new Path.Line(intersections[i].point, intersectionEndPoint);
		intersectionLine.style = lineStyle;
	}
}

function createChartLineButtons( chartLinesLayer ) {
	var chartLines = chartLinesLayer.children;
	var buttonSize = new Size(prefs.layout.supplyDemandButton.width, prefs.layout.supplyDemandButton.height);
	var buttonSpacing = prefs.layout.supplyDemandButton.spacing;

	var buttons = new Group({name: "buttons"});

	for( var i = 0; i < chartLines.length; i++) {
		var currentLine = chartLines[i];
		var buttonPosition = new Point( 0, i * (buttonSize.height + buttonSpacing) );
		

		var button = new Group({name: currentLine.data.label + " group"})
		button.data.chartline = currentLine;
		button.data.color = chartLines[i].data.color;
		
		var rectangle = new Rectangle(new Point(0, 0), buttonSize);
		var cornerRadiusSize = new Size(prefs.layout.supplyDemandButton.cornerRadius, prefs.layout.supplyDemandButton.cornerRadius);
		var buttonBox = new Path.Rectangle(rectangle, cornerRadiusSize);
		buttonBox.position = buttonPosition;
		buttonBox.name = "background";

		if(currentLine.visible) {
			buttonBox.fillColor = chartLines[i].data.color;
		} else {
			buttonBox.fillColor = prefs.color.disabledButton;
		}
		
		button.addChild(buttonBox);

		var label = new PointText( {
			point: buttonPosition,
			name: currentLine.data.label,
			fillColor: prefs.color.buttonText,
			content: createLabel(currentLine.data),
			justification: "center"
		} );
		label.style = prefs.textStyle.buttonLabel;
		label.position.y += 5;  //Centers text vertically in box
		
		button.onMouseDown = function () {
			this.data.chartline.visible = !this.data.chartline.visible;
			this.data.chartline.data.visible = this.data.chartline.visible;
			if(this.data.chartline.visible) {
				this.children["background"].fillColor = this.data.color;
			} else {
				this.children["background"].fillColor = prefs.color.disabledButton;
			}
	
			updateChart(data, prefs);
		};

		button.addChild(label);	
		buttons.addChild(button);
	}

	var safeBox = createSafeBoxDimensions(view.bounds, prefs.margin)
	var chartBox = createChartDimensions(safeBox);
	buttons.pivot = buttons.bounds.topLeft;
	buttons.position = chartBox.topRight;
	buttons.position.x += 75;
}

/**
 * Given the layer with chart lines get the intersections of with lines of other types
 * @param {Layer} chartLinesLayer 
 * @param {Rectangle} chartBoundaries 
 */
function createIntersectionLines( chartLinesLayer, chartBoundaries ){
	var chartLines = chartLinesLayer.children;

	for( var i = 0; i < chartLines.length; i++){
		for( var j = i + 1; j < chartLines.length; j++) {
			var lineA = chartLines[i];
			var lineB = chartLines[j];

			//Only check for crossing between different types of lines
			if( lineA.data.type != lineB.data.type) {
				var crossings = lineA.children["path"].getCrossings(lineB.children["path"]);
				if( lineA.visible && lineB.visible && crossings.length > 0 ){
					var intersectionPoint = crossings[0].point;
					var leftAxisPoint = new Point( chartBoundaries.left, intersectionPoint.y );
					var bottomAxisPoint = new Point( intersectionPoint.x, chartBoundaries.bottom );
					var intersection = new Path([leftAxisPoint, intersectionPoint, bottomAxisPoint]);
					intersection.style = prefs.lineStyle.intersection;
				}
			}
		}
	}
}

/**
 * Find a pivot point for a given line, using intersections lines of different type and ranked by lowest index.
 * @param {*} line 
 * @param {*} chartLinesLayer 
 */
function findPivot( line, chartLines ){
	var pivotPoint = null;
	var currentIndex = 9999999; // Tried using 'Number.MAX_SAFE_INTEGER;' but doesn't work in Smart Notebook

	for( var i = 0; i < chartLines.length; i++){
		var lineB = chartLines[i];

		//Only check for crossing between different types of lines
		if( line.data.type != lineB.data.type) {
			var crossings = line.children["path"].getCrossings(lineB.children["path"]);
			if( lineB.visible && crossings.length > 0 ){
				if( lineB.data.index < currentIndex ) {
					pivotPoint = crossings[0].point;
					currentIndex = lineB.data.index;
				}
			}
		}
	}
	return pivotPoint;
}

/**
 * Get position of lines on chart from x and y values between 0 and 1
 * @param {Number} x Value should between  0 an 1
 * @param {Number} y Value should between  0 an 1
 * @param {Rectangle} chartBoundaries 
 * @return {Point} 
 */
function getChartPosition( x, y, chartBoundaries ) {
	var xPos = chartBoundaries.left + chartBoundaries.width * x;
	var yPos = chartBoundaries.top + chartBoundaries.height - chartBoundaries.height * y;

	return new Point(xPos, yPos);
}

/**
 * Given a point within the chart/canvas space return a value between 0 and 1.0
 * @param {Point} point 
 * @param {Rectangle} chartBoundaries
 * @return {Point}
 */
function getUnitPosition( point, chartBoundaries ) {
	var x = (point.x - chartBoundaries.left) / chartBoundaries.width;
	var y = (chartBoundaries.top + chartBoundaries.height - point.y) / chartBoundaries.height;
	return new Point(x, y);
}

/**
 * Return the intersection points of a line given two points on that line with a rectangular boundary
 * @param {*} pointA 
 * @param {*} pointB 
 * @param {*} boundary 
 */
function getLineBoundaryIntersections(pointA, pointB, boundary) {
	var slope = (pointA.y - pointB.y) / (pointA.x - pointB.x);

	var start = boundPoint(boundary.left, boundary.top, boundary.bottom, pointA, slope);
	var end = boundPoint(boundary.right, boundary.top, boundary.bottom, pointA, slope);
	
	return {start: start, end: end};
}

/**
 * Find the intersection of a line with a given boundary on x axis and a top and bottom bounds
 * @param {*} xBound 
 * @param {*} top 
 * @param {*} bottom 
 * @param {*} point 
 * @param {*} slope 
 */
function boundPoint(xBound, top, bottom, point, slope) {
	var y = getYFor(xBound, point, slope);
	var x;
	
	if( y < top ) {
		y = top;
		x = getXFor(top, point, slope);
	} else if( y > bottom ) {
		y = bottom;
		x = getXFor(bottom, point, slope);
	} else {
		x = xBound;
	}
	
	return new Point(x, y);
}

/**
 * Returns value of x for a line through a given point with a given slope at specific value of y.
 * @param {*} y Value of y
 * @param {*} point Point on the line
 * @param {*} slope Slope of the line
 */
function getXFor(y, point, slope) {
	return point.x + (y - point.y) / slope;
}

/**
 * Returns value of y for a line through a given point with a given slope at specific value of x.
 * @param {*} x Value of x
 * @param {*} point Point on the line
 * @param {*} slope Slope of the line
 */
function getYFor(x, point, slope) {
	return slope * (x - point.x) + point.y;
}
