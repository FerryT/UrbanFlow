/**
 * Urban plan representation
 */

(function (global) {

//------------------------------------------------------------------------------

function Plan(id, domain)
{
	this.canvas = d3.select('#' + id);
	this.context = this.canvas.node().getContext('2d');
	this.domain = domain;

	this.resize();
	this.disabled = true;
}

Plan.prototype.resize = function resize()
{
	this.canvas
		.attr('width', this.domain[2] - this.domain[0])
		.attr('height', this.domain[3] - this.domain[1])
	;
}

Plan.prototype.getValue = function getValue(x, y)
{
	if (this.disabled)
		return 1;
	var rgb = this.context.getImageData(x, y, 1, 1).data,
		value = (rgb[0] + rgb[1] + rgb[2]) / 2;
	if (rgb[0] - rgb[2] > 85)
		return 0;   // blocked
	else if (value > 170)
		return .5;  // road
	else if (value > 85)
		return 1;   // pavement
	else
		return .75; // unassigned
}

Plan.prototype.getRaster = function getRaster()
{
	return this.getValue.bind(this);
}

Plan.prototype.drawRoad = function drawRoad(x1, y1, x2, y2)
{
	this.context.lineWidth = 24;
	this.context.lineCap = 'round';
	this.context.strokeStyle = 'black';
	draw_line(this.context, x1, y1, x2, y2);
}

Plan.prototype.drawPavement = function drawPavement(x1, y1, x2, y2)
{
	this.context.lineWidth = 12;
	this.context.lineCap = 'round';
	this.context.strokeStyle = 'gray';
	draw_line(this.context, x1, y1, x2, y2);
}

Plan.prototype.drawBuilding = function drawBuilding(x1, y1, x2, y2)
{
	this.context.lineWidth = 48;
	this.context.lineCap = 'round';
	this.context.strokeStyle = 'darkred';
	draw_line(this.context, x1, y1, x2, y2);
}

function draw_line(context, x1, y1, x2, y2)
{
	context.beginPath();
	context.moveTo(x1, y1);
	context.lineTo(x2, y2);
	context.stroke();
}

//------------------------------------------------------------------------------

global.Plan = Plan;

})(window || this);

//------------------------------------------------------------------------------
