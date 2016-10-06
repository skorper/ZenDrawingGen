/* control variables for polygon creation! */
var inPolygon = false; // are we currently building a polygon
var allPolygons = [];  // list of list of polygons on the page
var polygon = [];      // current polygon in creation [even = x, odd = y]
var generateSwirls = false; //controls whether or not we want to draw the swirly lines
var clear = false;
var example = false;


function Point(x = 0, y = 0, id = -1, color = 'black', width = 1) {
  this.x = x;// || 0;
  this.y = y;// || 0;
  this.id = id;// || -1; /* -1 means it's not in an outer polygon */
  this.color = color;// || 'black';
  this.width = width;// || 1;
}

// Draws this point to a given context
Point.prototype.draw = function(ctx) {
  ctx.beginPath();
  ctx.strokeStyle = this.color;
  ctx.lineWidth = this.width;
  ctx.arc(this.x, this.y, 5, 0, 2 * Math.PI);
  ctx.stroke();
}

/* check if provided coordinates are in this point 
   increasing selection bounds for ease of use
*/
Point.prototype.contains = function(mx, my) {
  return  (this.x - 5 <= mx) && (this.x + 5 >= mx) &&
          (this.y - 5 <= my) && (this.y + 5 >= my);
}

function CanvasState(canvas) {
  
  this.canvas = canvas;
  this.width = canvas.width;
  this.height = canvas.height;
  this.ctx = canvas.getContext('2d');
  
  var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
  if (document.defaultView && document.defaultView.getComputedStyle) {
    this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)      || 0;
    this.stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)       || 0;
    this.styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10)  || 0;
    this.styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)   || 0;
  }
  var html = document.body.parentNode;
  this.htmlTop = html.offsetTop;
  this.htmlLeft = html.offsetLeft;

  
  this.valid = false; // false == redraw
  this.points = [];  // the collection of things to be drawn
  this.dragging = false;
  this.selection = null;
  this.dragoffx = 0;
  this.dragoffy = 0;
  this.hovered = null; //testing currently
  this.x = 0; //used for moving line
  this.y = 0;
  
  var myState = this;
  
  /* fixes selection bug */
  canvas.addEventListener('selectstart', function(e) 
  { 
    e.preventDefault(); 
    return false; 
  }, false);
  
  document.onkeydown = function(evt) 
  {
    evt = evt || window.event;
    if (evt.keyCode == 27) 
    {
      myState.clearPolygon();
    }
  };
  
  CanvasState.prototype.clearPolygon = function()
  {
    /* check if we are in a polygon */
    
    if (inPolygon)
    {
      for (var i = 0; i < polygon.length; i++)
      {
        myState.points.pop();
      }
      polygon.length = 0;
      inPolygon = false;
      myState.valid = false;
    }
    /* check if we have a polygon selected */
    
    else if (myState.selection != null)
    {
      console.log("point to delete is in polygon " + myState.selection.id);
      
      /* remove polygon from master list */
      
      allPolygons.splice(myState.selection.id, 1);
      polygon.length = 0;
      inPolygon = false;

      for (var i = 0; i < myState.points.length; i++)
      {
        if (myState.points[i].id > myState.selection.id) /* account for downshift */
        {
          myState.points[i].id--;
        }
        else if (myState.points[i].id == myState.selection.id) /* remove point*/
        {
          myState.points.splice(i, 1);
          i--; /* adjust index */
        }
      }
      myState.selection = null;
      myState.valid = false;
    }
  }
 
  canvas.addEventListener('mousedown', function(e) 
  {
    /* clear selection */
    if (myState.selection) 
    {
      myState.selection = null;
      myState.valid = false; /* redraw */
    }
    
    /* new selection */
    
    var mouse = myState.getMouse(e);
    var mx = mouse.x;
    var my = mouse.y;
    var points = myState.points;
    for (var i = 0; i < points.length; i++) 
    {
      if (points[i].contains(mx, my) && !inPolygon) 
      {
        var mySel = points[i];
        myState.dragoffx = mx - mySel.x;
        myState.dragoffy = my - mySel.y;
        myState.dragging = true;
        myState.selection = mySel;
        myState.valid = false; /* redraw */
        return;
      }
    }
    
    /* new point while in polygon */
    
    if (inPolygon)
    {
      var mouse = myState.getMouse(e);
      var shape = new Point(mouse.x, mouse.y, allPolygons.length);
      var mx = mouse.x;
      var my = mouse.y;
      
      console.log('continuing polygon...');
      
      /* check if it's closing */

      if (polygon[0].contains(mx, my) && polygon.length >= 3)
      {
        /* new shape that matches original point coordinates */
        shape = new Point(polygon[0].x, polygon[0].y, allPolygons.length);
        
        inPolygon = false;
        console.log("finished polygon of size " + polygon.length);
        
        for (var i = 0; i < polygon.length; i++)
          console.log(polygon[i].x + ", " + polygon[i].y);

        /* add polygon to list */

        allPolygons.push(polygon.slice());
        myState.valid = false; /* redraw */
        console.log("we now have " + allPolygons.length + " polygons");  
      }
      else
      {
        /* check if it's on any other shape on the canvas */
        var points = myState.points;
        for (var i = 0; i < points.length; i++)
        {
          if (points[i].contains(mx, my))
          {
            shape = new Point(points[i].x, points[i].y, allPolygons.length);
          }
        }
        polygon.push(shape);
        myState.addShape(shape);
      }
    }

  }, true);
  
  canvas.addEventListener('mousemove', function(e) 
  {
    var mouse = myState.getMouse(e);
    var points = myState.points;
    if (myState.dragging)
    {
      
      /* move any points that share coordinates */
      for (var i = 0; i < points.length; i++)
      {
        if (points[i].contains(myState.selection.x, myState.selection.y))
        {
          points[i].x = mouse.x - myState.dragoffx;
          points[i].y = mouse.y - myState.dragoffy;
        }
      }
      
      /* move dragging shape */
      myState.selection.x = mouse.x - myState.dragoffx;
      myState.selection.y = mouse.y - myState.dragoffy;
      
      myState.valid = false; /* redraw */
    }
    if (inPolygon)
    {
      /* if in polygon, line should be drawn from previous
         point to current mouse position */
      myState.x = mouse.x;
      myState.y = mouse.y;
      myState.valid = false; /* redraw */
    }
    
    if (myState.hovered != null)
    {
      myState.hovered = null;
    }
    
    /* check if mouse is overlapping a point in a finished plygon */
    for (var i = 0; i < points.length; i++)
    {
      if (points[i].contains(mouse.x, mouse.y))
      {
        myState.hovered = points[i];
        myState.valid = false; /*redraw */
      }
    }
    
    
    /* check if mouse is overlapping a point in unfinished polygon */
    
    //...
  }, true);
  
  canvas.addEventListener('mouseup', function(e) 
  {
    /* merge any nearby points */
    
    var points = myState.points;
    var mouse = myState.getMouse(e);
    
    for (var i = 0; i < points.length; i++)
    {
      if (points[i].contains(mouse.x, mouse.y) && myState.selection != null)
      {
        myState.selection.x = points[i].x;
        myState.selection.y = points[i].y;
        myState.valid = false;
      }
    }
    
    myState.dragging = false;
  }, true);
  
  
  canvas.addEventListener('dblclick', function(e) 
  {
    if (!Boolean(inPolygon))
    {
      var mouse = myState.getMouse(e);
      var shape = new Point(mouse.x, mouse.y, allPolygons.length);
      
      /* check if it's inside another point, then merge */
      var points = myState.points;
      for (var i = 0; i < points.length; i++)
      {
        if (points[i].contains(mouse.x, mouse.y))
        {
          shape = new Point(points[i].x, points[i].y, allPolygons.length);
        }
      }
      
      var mx = mouse.x;
      var my = mouse.y;
      inPolygon = true;
      myState.addShape(shape);
      myState.x = mx;
      myState.y = my; //prevents weird line bug 
      console.log('starting a new polygon');
      polygon.length = 0;
      polygon.push(shape);
    }
  }, true);
  
  this.selectionWidth = 2;  
  this.interval = 60;
  setInterval(function() { myState.draw(); }, myState.interval);
}

CanvasState.prototype.addShape = function(shape) 
{
  this.points.push(shape);
  this.valid = false;
}

CanvasState.prototype.clear = function() 
{
  this.ctx.clearRect(0, 0, this.width, this.height);
}

CanvasState.prototype.draw = function() 
{
  if (clear) /*clear button was pressed */
  {
    console.log("clearing");
    polygon.length = 0;
		inPolygon = false;
    allPolygons.length = 0;
    this.points.length = 0;
    this.valid = false;
    clear = false;
  }
	if (!generateSwirls)
  {
		this.valid = false;
	}
  if (!this.valid || generateSwirls) 
  {
    this.clear();
    var ctx = this.ctx;
    var points = this.points;

    // background stuff here
    
    /* reset all colors and widths */
    var length = points.length;
    for (var i = 0; i < length; i++) 
    {
      var shape = points[i];
      points[i].color = 'black';
      points[i].width = 1;
    }
    
    /* set selected to red */
    if (this.selection != null)
    {
      this.selection.color = 'red';
    }
    
    if (this.hovered != null)
    {
      this.hovered.width = 2;
    }
    
    /* draw all points */
    for (var i = 0; i < length; i++) 
    {
      var shape = points[i];
      points[i].draw(ctx);
    }
    
    /* draw finished polygon lines */
    for (var i = 0; i < allPolygons.length; i++)
    {
      for (var j = 0; j < allPolygons[i].length; j++)
      {
        ctx.beginPath();
				ctx.lineWidth = 1;
        ctx.strokeStyle = 'black';
        ctx.moveTo(allPolygons[i][j].x, allPolygons[i][j].y);
        ctx.lineWidth = 1;
        ctx.lineTo(allPolygons[i][(j + 1) % allPolygons[i].length].x, allPolygons[i][(j + 1) % allPolygons[i].length].y);
        ctx.stroke();
      }
    }
    
    /*draw current polygon lines */
    
    for (var i = 0; i < polygon.length - 1; i++)
    {
      ctx.beginPath();
			ctx.lineWidth = 1;
      ctx.moveTo(polygon[i].x, polygon[i].y);
      ctx.lineTo(polygon[i + 1].x, polygon[i + 1].y);
      ctx.stroke();
    }
    
    /* draw moving line */
    
    if (inPolygon && polygon.length > 0)
    {
      ctx.beginPath();
			ctx.lineWidth = 1;
      ctx.moveTo(polygon[polygon.length - 1].x, polygon[polygon.length - 1].y);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
    }
		
		if (generateSwirls)
		{
			for (var i = 0; i < allPolygons.length; i++)
			{
				if (checkConvexity(allPolygons[i])) //comment out "if statement" if you want
				{																		//to see designs on all polygon shapes.
					this.drawSwirls(allPolygons[i]);  //it can look pretty neat
				}
			}
		}   
    // foreground stuff here
    
    this.valid = true;
  }
}

var DENSITY = 15;

CanvasState.prototype.drawSwirls = function(poly) 
{
  ctx = this.ctx;
   
  var innerPoly = [];
  
  for (var j = 0; j < poly.length; j++)
  {
    var start = poly[j];
    var end = poly[(j + 1) % poly.length];

    var dx = end.x - start.x;
    var dy = end.y - start.y;
    
    var distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < DENSITY)
    {
      return;
    }

    var numPoints = distance / DENSITY; /* controls the density. lower == denser */

    var stepx = dx / numPoints;
    var stepy = dy / numPoints;
    var px = start.x + stepx;
    var py = start.y + stepy;
    
    innerPoly.push(new Point(px, py));

    ctx.beginPath();
		ctx.lineWidth = 1;
    //ctx.strokeStyle = 'green';
    //ctx.lineWidth = 2;
    //ctx.arc(px, py, 2, 0, 2 * Math.PI);
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();  
  }
  /* recursively call this method... */
  this.drawSwirls(innerPoly);
}
  
CanvasState.prototype.getMouse = function(e) 
{
  var element = this.canvas, offsetX = 0, offsetY = 0, mx, my;
  
  if (element.offsetParent !== undefined) 
  {
    do 
    {
      offsetX += element.offsetLeft;
      offsetY += element.offsetTop;
    } while ((element = element.offsetParent));
  }

  offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
  offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

  mx = e.pageX - offsetX;
  my = e.pageY - offsetY;
  
  return {x: mx, y: my};
}

function checkConvexity(poly)
{
	var negative = false;
	var positive = false;
	var size = poly.length;
	var b;
	var c;
	for (var a = 0; a < size; a++)
	{
		b = (a + 1) % size;
		c = (b + 1) % size;

		/*a b and c are our 3 points to check for convexity */

		var xproduct = xProductLength(poly[a], poly[b], poly[c]); 
		if (xproduct < 0)
		{
			negative = true;
		}   
		else if (xproduct > 0)
		{
			positive = true;
		} 
		if (negative && positive) /* all must have same sign */
		{
			return false;
		} 
	}
  return true;
}
function xProductLength(a, b, c)
{
    var BAx = a.x - b.x;
    var BAy = a.y - b.y;
    var BCx = c.x - b.x;
    var BCy = c.y - b.y;
    return (BAx * BCy - BAy * BCx);
}

function populate()
{
  /* make sure all polygons are closed */
  if (inPolygon)
  {
    console.log("All polygons must be closed in order to generate lines");
    return;
  }
	
  /* populate lines flag -- drawn in draw()*/
	if (generateSwirls)
	{
		document.getElementById("gen").style.background='#102624';
	}
	else
	{
		document.getElementById("gen").style.background='#000000';
	}
  generateSwirls = !generateSwirls;
	
}

function clearPolygons()
{
  clear = true;
}

/*
function samplePoints()
{
  clearPolygons();
  example = true;
}*/

function init() 
{
  var s = new CanvasState(document.getElementById('canvas'));
}

function resizeCanvas() 
{
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas, false);
resizeCanvas();

$('.showInstructions').click(showHide);

function showHide(){
	$('#instructions').slideToggle();
}
