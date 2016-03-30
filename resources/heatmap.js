/**
 * Heatmap visualisation of the ACO pheromone levels
 */

(function (global) {

//------------------------------------------------------------------------------

function Heatmap(id, aco)
{
	this.canvas = d3.select('#' + id);
	this.context = this.canvas.node().getContext('2d');
	this.aco = aco;

	this.opacity = 1;
	this.color = d3.scale.linear()
		.domain([1, .75, .5, .25, 0])
		.range(['#a6611a', '#dfc27d', '#f5f5f5', '#80cdc1', '#018571'])
	;

	this.resize();
}

Heatmap.prototype.resize = function resize()
{
	var domain = this.aco.grid.domain,
		resolution = this.aco.grid.resolution;
	this.width = domain[2] - domain[0];
	this.height = domain[3] - domain[1];
	this.cellwidth = this.width / resolution[0];
	this.cellheight = this.height / resolution[1];
	this.canvas
		.attr('width', this.width)
		.attr('height', this.height)
	;
	this.redraw();
}

Heatmap.prototype.redraw = function redraw()
{
	var heatmap = this,
		cw = this.cellwidth,
		ch = this.cellheight,
		hcw = cw / 2,
		hch = ch / 2;
	this.context.globalAlpha = this.opacity;
	this.context.clearRect(0, 0, this.width, this.height);
	this.aco.grid.eachCell(function (cell)
	{
		var value = Math.max.apply(null, cell.edges.map(function (edge)
			{
				return heatmap.aco.globalTrails[edge.index];
			})),
			x = cell.x - hcw, y = cell.y - hch,
			sx = x << 0, sy = y << 0,
			ox = x - sx, oy = y - sy;
		heatmap.context.fillStyle = heatmap.color(Math.min(value, 1));
		heatmap.context.beginPath();
		heatmap.context.rect(sx, sy, (cw + ox) << 0, (ch + oy) << 0);
		heatmap.context.fill();
		heatmap.context.closePath();
	});
}

//------------------------------------------------------------------------------

global.Heatmap = Heatmap;

})(window || this);

//------------------------------------------------------------------------------
