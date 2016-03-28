/**
 * Visuals - Visualisation of the ACO algorithm
 */

(function (global) {

//------------------------------------------------------------------------------

function Field(id, colony, domain, resolution)
{
	this.field = d3.select('#' + id);
	this.colony = colony;
	this.grid = colony.grid;

	this.domain = [
		domain[0], domain[1],
		domain[2] - domain[0],
		domain[3] - domain[1],
	];
	this.resolution = [
		(domain[2] - domain[0]) / resolution[0],
		(domain[3] - domain[1]) / resolution[1],
	]

	this.field.attr('viewBox', domain.join(' '));
	this.trail = this.field.append('g');
	this.path = this.field.append('path');
}

Field.prototype.draw = function draw()
{
	var self = this,
		values = {};

	function index(cell) { return '' + (cell.x << 0) + ' ' + (cell.y << 0); }

	this.grid.eachEdge(function (edge)
	{
		var i = index(edge.v);
		values[i] = Math.max(values[i] || 0, self.colony.globalTrails[edge.index]);
	});

	var trail = this.trail.selectAll('rect').data(this.grid.cells),
		color = d3.scale.linear().domain([1,.75,.5,.25,0])
			.range(['#a6611a','#dfc27d','#f5f5f5','#80cdc1','#018571'])
		sx = this.resolution[0],
		sy = this.resolution[1];
	trail.enter().append('rect')
		.attr('width', sx)
		.attr('height', sy)
		.attr('x', function (d) { return d.x - sx / 2; })
		.attr('y', function (d) { return d.y - sy / 2; })
	;
	trail
		.style('fill', function (d)
		{
			var value = values[index(d)];
			if (d.occupied)
				return 'Aquamarine';
			return color(Math.min(value, 1));
		})
	;
	trail.exit().remove();

	if (!this.colony.best || this.colony.best.length == Infinity) return this;
	var line = d3.svg.line()
			.x(function (d) { return d.v.x; })
			.y(function (d) { return d.v.y; })
			.interpolate('basis')
		;
	this.path.attr('d', line(this.colony.best));

	return this;
}

//------------------------------------------------------------------------------

global.Field = Field;

})(window || this);

//------------------------------------------------------------------------------
